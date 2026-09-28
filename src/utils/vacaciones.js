// src/utils/vacaciones.js
// Lógica de cálculo de Licencia Anual Ordinaria (vacaciones)
// Convenios: Municipal, Medico, Radiologo, Docente

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────
// TABLAS DE DÍAS POR ANTIGÜEDAD (fuente: grilla oficial)
// ─────────────────────────────────────────────

/**
 * Cada tabla define tramos de antigüedad con sus días totales anuales.
 * La propiedad `tipo` indica si los días son "habiles" o "corridos".
 * La propiedad `grilla` es la tabla proporcional para reingresos:
 *   grilla[mes - 1][tramoIndex] = días proporcionales
 *   (mes va de 1 a 12, tramoIndex corresponde al orden de `tramos`)
 */

export const TABLAS_CONVENIO = {
  Municipal: {
    tipo: "habiles",
    tramos: [
      { desde: 1,  hasta: 4,   dias: 14, label: "1 AÑO O +"  },
      { desde: 5,  hasta: 9,   dias: 21, label: "5 AÑOS O +" },
      { desde: 10, hasta: 19,  dias: 28, label: "10 AÑOS O +" },
      { desde: 20, hasta: 999, dias: 35, label: "20 AÑOS O +" },
    ],
    // grilla[mes-1][tramoIndex] — mes 1..12, tramo 0..3
    grilla: [
      [ 1,  1,  2,  3],  // mes 1
      [ 2,  3,  4,  6],  // mes 2
      [ 3,  4,  7,  9],  // mes 3
      [ 5,  7,  9, 12],  // mes 4
      [ 6,  8, 11, 15],  // mes 5
      [ 7, 10, 14, 18],  // mes 6
      [ 8, 11, 16, 20],  // mes 7
      [ 9, 14, 18, 23],  // mes 8
      [10, 15, 21, 26],  // mes 9
      [12, 17, 23, 29],  // mes 10
      [13, 18, 25, 32],  // mes 11
      [14, 21, 28, 35],  // mes 12
    ],
  },

  Medico: {
    tipo: "corridos",
    tramos: [
      { desde: 1,  hasta: 4,   dias: 20, label: "1 AÑO O +"  },
      { desde: 5,  hasta: 9,   dias: 25, label: "5 AÑOS O +" },
      { desde: 10, hasta: 999, dias: 30, label: "10 AÑOS O +" },
    ],
    grilla: [
      [ 1,  2,  2],  // mes 1
      [ 3,  4,  5],  // mes 2
      [ 5,  6,  7],  // mes 3
      [ 7,  8, 10],  // mes 4
      [ 8, 10, 12],  // mes 5
      [10, 12, 15],  // mes 6
      [12, 15, 17],  // mes 7
      [13, 17, 20],  // mes 8
      [15, 19, 22],  // mes 9
      [17, 21, 25],  // mes 10
      [18, 23, 27],  // mes 11
      [20, 25, 30],  // mes 12
    ],
  },

  Radiologo: {
    tipo: "corridos",
    tramos: [
      { desde: 1, hasta: 999, dias: 50, label: "1 AÑO O +" },
    ],
    // Nota: la grilla de Radiólogos tiene valores > 12 meses (proporcional especial)
    grilla: [
      [ 4],  // mes 1
      [ 8],  // mes 2
      [12],  // mes 3
      [16],  // mes 4
      [20],  // mes 5
      [24],  // mes 6
      [29],  // mes 7
      [33],  // mes 8
      [37],  // mes 9
      [41],  // mes 10
      [45],  // mes 11
      [50],  // mes 12
    ],
  },

  Docente: {
    tipo: "corridos",
    tramos: [
      { desde: 1,  hasta: 19,  dias: 30, label: "1 AÑO O +"  },
      { desde: 20, hasta: 999, dias: 40, label: "20 AÑOS O +" },
    ],
    grilla: [
      [ 1,  2],  // mes 1
      [ 3,  5],  // mes 2
      [ 6,  8],  // mes 3
      [ 9, 12],  // mes 4
      [12, 16],  // mes 5
      [15, 20],  // mes 6
      [18, 24],  // mes 7
      [21, 28],  // mes 8
      [24, 32],  // mes 9
      [27, 36],  // mes 10
      [30, 40],  // mes 11
      [30, 40],  // mes 12 (igual a 11 según grilla — sin dato explícito)
    ],
  },
};

// ─────────────────────────────────────────────
// HELPERS DE FECHA
// ─────────────────────────────────────────────

/**
 * Parsea "yyyy-mm-dd" o "dd/mm/yyyy" a Date local (sin shift UTC).
 */
export function parseFechaLocal(str) {
  if (!str) return null;
  if (str instanceof Date) return new Date(str.getFullYear(), str.getMonth(), str.getDate());
  const s = String(str).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const local = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (local) return new Date(+local[3], +local[2] - 1, +local[1]);
  return null;
}

/**
 * Calcula años completos entre dos fechas (antigüedad).
 * @param {Date} fechaIngreso
 * @param {Date} [referencia] — por defecto 31/12 del año vacacional
 */
export function calcularAntiguedad(fechaIngreso, referencia) {
  const ref = referencia || new Date();
  const años = ref.getFullYear() - fechaIngreso.getFullYear();
  const cumplioAniversario =
    ref.getMonth() > fechaIngreso.getMonth() ||
    (ref.getMonth() === fechaIngreso.getMonth() && ref.getDate() >= fechaIngreso.getDate());
  return cumplioAniversario ? años : años - 1;
}

/**
 * Calcula meses completos trabajados desde `fechaDesde` hasta el 31/12 del año vacacional.
 */
export function calcularMesesTrabajados(fechaDesde, anioVacacional) {
  const inicio = parseFechaLocal(fechaDesde);
  if (!inicio) return 0;
  const fin = new Date(anioVacacional, 11, 31); // 31/12
  if (inicio > fin) return 0;

  let meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
  // Si el día de inicio es posterior al 1, el primer mes no es completo
  if (inicio.getDate() > 1) meses -= 1;
  return Math.max(0, Math.min(12, meses));
}

// ─────────────────────────────────────────────
// LÓGICA PRINCIPAL DE CÁLCULO
// ─────────────────────────────────────────────

/**
 * Obtiene el índice del tramo de antigüedad dentro de la tabla del convenio.
 */
function getTramoIndex(tabla, antiguedad) {
  const idx = tabla.tramos.findIndex(
    (t) => antiguedad >= t.desde && antiguedad <= t.hasta
  );
  return idx === -1 ? tabla.tramos.length - 1 : idx;
}

/**
 * Obtiene los días anuales completos según convenio y antigüedad.
 * @param {string} convenio — "Municipal" | "Medico" | "Radiologo" | "Docente"
 * @param {number} antiguedad — años completos
 * @returns {{ dias: number, tipo: string, label: string }}
 */
export function getDiasAnuales(convenio, antiguedad) {
  const tabla = TABLAS_CONVENIO[convenio];
  if (!tabla) throw new Error(`Convenio desconocido: ${convenio}`);
  const idx = getTramoIndex(tabla, antiguedad);
  const tramo = tabla.tramos[idx];
  return { dias: tramo.dias, tipo: tabla.tipo, label: tramo.label };
}

/**
 * CASO NORMAL: calcula días de vacaciones sin casos especiales.
 * @param {object} params
 * @param {string} params.convenio
 * @param {string} params.fechaIngreso — "yyyy-mm-dd"
 * @param {number} params.anioVacacional — ej: 2025
 * @returns {{ dias: number, tipo: string, antiguedad: number, label: string }}
 */
export function calcularDiasNormal({ convenio, fechaIngreso, anioVacacional }) {
  const ingreso = parseFechaLocal(fechaIngreso);
  if (!ingreso) throw new Error("Fecha de ingreso inválida.");

  // La antigüedad se calcula al 31/12 del año vacacional
  const ref = new Date(anioVacacional, 11, 31);
  const antiguedad = calcularAntiguedad(ingreso, ref);

  if (antiguedad < 1) {
    // Menos de 1 año: proporcional por meses trabajados en el año vacacional
    const meses = calcularMesesTrabajados(fechaIngreso, anioVacacional);
    return calcularDiasReingreso({ convenio, antiguedadAlReingreso: 0, mesesTrabajados: meses });
  }

  const { dias, tipo, label } = getDiasAnuales(convenio, antiguedad);
  return { dias, tipo, antiguedad, label, caso: "normal" };
}

/**
 * CASO REINGRESO: calcula días proporcionales según grilla oficial.
 * @param {object} params
 * @param {string} params.convenio
 * @param {number} params.antiguedadAlReingreso — años completos al momento del reingreso
 * @param {number} params.mesesTrabajados — meses completos trabajados en el año de reingreso (1-12)
 * @returns {{ dias: number, tipo: string, label: string }}
 */
export function calcularDiasReingreso({ convenio, antiguedadAlReingreso, mesesTrabajados }) {
  const tabla = TABLAS_CONVENIO[convenio];
  if (!tabla) throw new Error(`Convenio desconocido: ${convenio}`);

  const mes = Math.max(1, Math.min(12, mesesTrabajados));
  const tramoIdx = getTramoIndex(tabla, Math.max(1, antiguedadAlReingreso));
  const dias = tabla.grilla[mes - 1][tramoIdx];

  return {
    dias,
    tipo: tabla.tipo,
    label: tabla.tramos[tramoIdx].label,
    caso: "reingreso",
    mesesTrabajados: mes,
    antiguedadAlReingreso,
  };
}

/**
 * CASO CAMBIO DE CONVENIO: calcula días proporcionales combinando dos convenios.
 * @param {object} params
 * @param {string} params.convenioAnterior
 * @param {string} params.convenioNuevo
 * @param {number} params.mesesConvenioAnterior — meses bajo el convenio anterior en el año vacacional
 * @param {number} params.mesesConvenioNuevo — meses bajo el convenio nuevo en el año vacacional
 * @param {number} params.antiguedad — años completos al 31/12 del año vacacional
 * @returns {{ dias: number, desglose: object }}
 */
export function calcularDiasCambioConvenio({
  convenioAnterior,
  convenioNuevo,
  mesesConvenioAnterior,
  mesesConvenioNuevo,
  antiguedad,
}) {
  const { dias: diasAnt, tipo: tipoAnt } = getDiasAnuales(convenioAnterior, antiguedad);
  const { dias: diasNuevo, tipo: tipoNuevo } = getDiasAnuales(convenioNuevo, antiguedad);

  const propAnt = Math.round((diasAnt / 12) * mesesConvenioAnterior);
  const propNuevo = Math.round((diasNuevo / 12) * mesesConvenioNuevo);
  const total = propAnt + propNuevo;

  return {
    dias: total,
    caso: "cambioConvenio",
    desglose: {
      convenioAnterior,
      diasAnterior: propAnt,
      tipoAnterior: tipoAnt,
      mesesAnterior: mesesConvenioAnterior,
      convenioNuevo,
      diasNuevo: propNuevo,
      tipoNuevo,
      mesesNuevo: mesesConvenioNuevo,
    },
  };
}

/**
 * Función principal unificada: decide qué caso aplicar y devuelve el resultado.
 * @param {object} params
 * @param {string}  params.convenio           — convenio actual
 * @param {string}  params.fechaIngreso        — "yyyy-mm-dd"
 * @param {number}  params.anioVacacional
 * @param {boolean} [params.esReingreso]
 * @param {string}  [params.fechaReingreso]    — "yyyy-mm-dd", requerido si esReingreso=true
 * @param {boolean} [params.esCambioConvenio]
 * @param {string}  [params.convenioAnterior]  — requerido si esCambioConvenio=true
 * @param {number}  [params.mesesConvenioAnterior]
 * @param {number}  [params.mesesConvenioNuevo]
 */
export function calcularVacaciones(params) {
  const {
    convenio,
    fechaIngreso,
    anioVacacional,
    esReingreso = false,
    fechaReingreso = null,
    esCambioConvenio = false,
    convenioAnterior = null,
    mesesConvenioAnterior = 0,
    mesesConvenioNuevo = 0,
  } = params;

  if (esCambioConvenio && convenioAnterior) {
    const ref = new Date(anioVacacional, 11, 31);
    const ingreso = parseFechaLocal(fechaIngreso);
    const antiguedad = calcularAntiguedad(ingreso, ref);
    return calcularDiasCambioConvenio({
      convenioAnterior,
      convenioNuevo: convenio,
      mesesConvenioAnterior,
      mesesConvenioNuevo,
      antiguedad,
    });
  }

  if (esReingreso && fechaReingreso) {
    const ingreso = parseFechaLocal(fechaIngreso);
    const reingreso = parseFechaLocal(fechaReingreso);
    // Antigüedad al momento del reingreso (referencia = fecha de reingreso)
    const antiguedadAlReingreso = calcularAntiguedad(ingreso, reingreso);
    const mesesTrabajados = calcularMesesTrabajados(fechaReingreso, anioVacacional);
    return calcularDiasReingreso({ convenio, antiguedadAlReingreso, mesesTrabajados });
  }

  return calcularDiasNormal({ convenio, fechaIngreso, anioVacacional });
}

// ─────────────────────────────────────────────
// FIRESTORE — CRUD DE SOLICITUDES
// ─────────────────────────────────────────────

/**
 * Genera un número de solicitud único: "VAC-YYYY-NNNNN"
 */
async function generarNroSolicitud(anio) {
  const q = query(
    collection(db, "solicitudesVacaciones"),
    where("anioVacacional", "==", anio),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  const siguiente = snap.size + 1;
  return `VAC-${anio}-${String(siguiente).padStart(5, "0")}`;
}

/**
 * Crea una nueva solicitud de vacaciones en Firestore.
 * Calcula automáticamente los días y asigna el número de solicitud.
 */
export async function crearSolicitudVacaciones(datos) {
  const {
    legajo,
    nombreCompleto,
    cargo,
    area,
    convenio,
    esJerarquico = false,
    fechaIngreso,
    anioVacacional,
    diasSolicitados,
    fechaDesde,
    fechaHasta,
    observaciones = "",
    solicitadoPor,
    // casos especiales
    esReingreso = false,
    fechaReingreso = null,
    esCambioConvenio = false,
    convenioAnterior = null,
    mesesConvenioAnterior = 0,
    mesesConvenioNuevo = 0,
  } = datos;

  // Calcular días que corresponden
  const resultado = calcularVacaciones({
    convenio,
    fechaIngreso,
    anioVacacional,
    esReingreso,
    fechaReingreso,
    esCambioConvenio,
    convenioAnterior,
    mesesConvenioAnterior,
    mesesConvenioNuevo,
  });

  const nroSolicitud = await generarNroSolicitud(anioVacacional);

  const docData = {
    nroSolicitud,
    legajo: String(legajo),
    nombreCompleto,
    cargo: cargo || "",
    area: area || "",
    convenio,
    esJerarquico,
    fechaIngreso,
    anioVacacional,
    diasCorresponden: resultado.dias,
    tipoDias: resultado.tipo,
    diasSolicitados: Number(diasSolicitados),
    fechaDesde: fechaDesde || "",
    fechaHasta: fechaHasta || "",
    estado: "pendiente",
    observaciones,
    solicitadoPor: solicitadoPor || "",
    // casos especiales
    esReingreso,
    fechaReingreso: fechaReingreso || null,
    esCambioConvenio,
    convenioAnterior: convenioAnterior || null,
    mesesConvenioAnterior,
    mesesConvenioNuevo,
    calculoDetalle: resultado,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "solicitudesVacaciones"), docData);
  return { id: ref.id, ...docData };
}

/**
 * Trae todas las solicitudes de vacaciones, con filtros opcionales.
 */
export async function fetchSolicitudesVacaciones({ legajo = "", area = "", anio = null, estado = "" } = {}) {
  const constraints = [];
  if (anio) constraints.push(where("anioVacacional", "==", Number(anio)));
  if (estado) constraints.push(where("estado", "==", estado));

  const q = query(collection(db, "solicitudesVacaciones"), ...constraints, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (legajo) {
    const lj = String(legajo).trim().toLowerCase();
    rows = rows.filter((r) => String(r.legajo || "").toLowerCase().includes(lj));
  }
  if (area) {
    const a = area.trim().toLowerCase();
    rows = rows.filter((r) => String(r.area || "").toLowerCase().includes(a));
  }

  return rows;
}

/**
 * Actualiza el estado de una solicitud ("aprobada" | "rechazada").
 */
export async function actualizarEstadoSolicitud(id, estado, observaciones = "") {
  const ref = doc(collection(db, "solicitudesVacaciones"), id);
  await updateDoc(ref, { estado, observaciones, updatedAt: serverTimestamp() });
}

// ─────────────────────────────────────────────
// SALDO DE DÍAS DISPONIBLES
// ─────────────────────────────────────────────

/**
 * Calcula los días disponibles para un empleado en un período dado.
 *
 * Lógica:
 *  - Trae todas las solicitudes NO rechazadas del legajo para el año vacacional.
 *  - Suma los días ya solicitados en esas solicitudes.
 *  - Devuelve: { diasCorresponden, diasUsados, diasDisponibles, solicitudesAnteriores }
 *
 * @param {string} legajo
 * @param {number} anioVacacional
 * @param {number} diasCorresponden — calculados para este período
 * @returns {Promise<{ diasCorresponden: number, diasUsados: number, diasDisponibles: number, solicitudesAnteriores: Array }>}
 */
export async function fetchDiasDisponibles(legajo, anioVacacional, diasCorresponden) {
  const q = query(
    collection(db, "solicitudesVacaciones"),
    where("legajo", "==", String(legajo)),
    where("anioVacacional", "==", Number(anioVacacional))
  );
  const snap = await getDocs(q);
  const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Solo cuentan las que NO fueron rechazadas
  const validas = todas.filter((s) => s.estado !== "rechazada");
  const diasUsados = validas.reduce((acc, s) => acc + (Number(s.diasSolicitados) || 0), 0);
  const diasDisponibles = Math.max(0, diasCorresponden - diasUsados);

  return {
    diasCorresponden,
    diasUsados,
    diasDisponibles,
    solicitudesAnteriores: validas,
  };
}
