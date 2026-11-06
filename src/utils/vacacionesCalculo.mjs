import catalogo from "../data/vacacionesCategorias.json" with { type: "json" };
import { buscarRegimenVacacional, normalizarParticion, normalizarPlanta } from "./regimenVacaciones.mjs";

export const TIPOS_CARGO_VACACIONES = [
  { value: "permanente", label: "Planta permanente" },
  { value: "temporario", label: "Temporario" },
  { value: "contratado", label: "Docentes provisionales" },
  { value: "pasantia", label: "Pasantía" },
  { value: "interino", label: "Interino" },
];
export const PARTICIONES_VACACIONES = [
  { value: "municipal", label: "Carrera Municipal" },
  { value: "docente", label: "Carrera Docente" },
  { value: "medico", label: "Carrera Médica" },
  { value: "radiologo", label: "Radiólogo (régimen existente)" },
];
export function convenioDeParticion(particion) {
  return ({ "CARRERA MUNICIPAL": "Municipal", "CARRERA DOCENTE": "Docente", "CARRERA MEDICA": "Medico", RADIOLOGO: "Radiologo" })[normalizarParticion(particion)] || "";
}

export function resolverRegimenVacacional(perfil) {
  const convenio = convenioDeParticion(perfil.particion);
  if (convenio === "Radiologo") {
    return { encontrado: true, tipo: "corridos", descripcion: "Días corridos", convenio, filaFuente: null, origen: "Régimen de radiólogos ya configurado" };
  }
  return { ...buscarRegimenVacacional(perfil, catalogo.reglas), convenio, origen: catalogo.fuente.archivo };
}

export function perfilVacacionalEmpleado(empleado) {
  const planta = normalizarPlanta(empleado.tipoCargo);
  const tipoCargo = TIPOS_CARGO_VACACIONES.find(p => normalizarPlanta(p.value) === planta)?.value || empleado.tipoCargo || "";
  const convenio = convenioDeParticion(empleado.particion);
  const particion = PARTICIONES_VACACIONES.find(p => convenioDeParticion(p.value) === convenio)?.value || empleado.particion || "";
  return { tipoCargo, particion, categoria: empleado.categoria || "" };
}

function exigirRegimen(perfil, etiqueta) {
  const resultado = resolverRegimenVacacional(perfil);
  if (!resultado.encontrado) {
    throw new Error(resultado.motivo === "datos_incompletos"
      ? `Completá ${resultado.faltantes.join(", ")} de la situación ${etiqueta}.`
      : `La combinación de planta, partición y categoría de la situación ${etiqueta} no figura en la planilla de RRHH.`);
  }
  return resultado;
}

export function describirDiasPorTipo(bolsas) {
  return [bolsas?.habiles > 0 && `${bolsas.habiles} días hábiles`, bolsas?.corridos > 0 && `${bolsas.corridos} días corridos`].filter(Boolean).join(" + ") || "0 días";
}

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
      { desde: 1,  hasta: 4,   dias: 14, label: "1 a 4 AÑOS"  },
      { desde: 5,  hasta: 9,   dias: 21, label: "5 a 9 AÑOS" },
      { desde: 10, hasta: 19,  dias: 28, label: "10 a 19 AÑOS" },
      { desde: 20, hasta: 999, dias: 35, label: "20 AÑOS O MÁS" },
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
      { desde: 1,  hasta: 4,   dias: 20, label: "1 a 4 AÑOS"  },
      { desde: 5,  hasta: 9,   dias: 25, label: "5 a 9 AÑOS" },
      { desde: 10, hasta: 999, dias: 30, label: "10 a 999 AÑOS" },
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
      { desde: 1, hasta: 999, dias: 50, label: "1 AÑO O MÁS" },
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
      { desde: 1,  hasta: 19,  dias: 30, label: "1 a 19 AÑOS"  },
      { desde: 20, hasta: 999, dias: 40, label: "20 AÑOS O MÁS" },
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
  const local = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const partes = iso ? [+iso[1], +iso[2], +iso[3]] : local ? [+local[3], +local[2], +local[1]] : null;
  if (!partes) return null;
  const [anio, mes, dia] = partes;
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia ? fecha : null;
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

  let meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth()) + 1;
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
  const idx = getTramoIndex(tabla, Math.max(1, antiguedad));
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
 * @param {number} params.mesesTrabajados — meses completos trabajados en el año de reingreso (0-12)
 * @returns {{ dias: number, tipo: string, label: string }}
 */
export function calcularDiasReingreso({ convenio, antiguedadAlReingreso, mesesTrabajados }) {
  const tabla = TABLAS_CONVENIO[convenio];
  if (!tabla) throw new Error(`Convenio desconocido: ${convenio}`);

  const mes = Math.max(0, Math.min(12, mesesTrabajados));
  const tramoIdx = getTramoIndex(tabla, Math.max(1, antiguedadAlReingreso));
  const dias = mes === 0 ? 0 : tabla.grilla[mes - 1][tramoIdx];

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
 * @returns {{ dias: number|null, tipo: string, diasPorTipo: object, desglose: object }}
 */
export function calcularDiasCambioConvenio({
  convenioAnterior,
  convenioNuevo,
  mesesConvenioAnterior,
  mesesConvenioNuevo,
  antiguedad,
  tipoAnterior,
  tipoNuevo: formatoNuevo,
}) {
  const { dias: diasAnt, tipo: tipoAnt } = getDiasAnuales(convenioAnterior, antiguedad);
  const { dias: diasNuevo, tipo: tipoNuevo } = getDiasAnuales(convenioNuevo, antiguedad);

  const propAnt = Math.round((diasAnt / 12) * mesesConvenioAnterior);
  const propNuevo = Math.round((diasNuevo / 12) * mesesConvenioNuevo);
  const bolsas = { habiles: 0, corridos: 0 };
  const formatoAnt = tipoAnterior || tipoAnt;
  const formatoActual = formatoNuevo || tipoNuevo;
  bolsas[formatoAnt] += propAnt;
  bolsas[formatoActual] += propNuevo;
  const tipo = bolsas.habiles > 0 && bolsas.corridos > 0 ? "mixto" : bolsas.habiles > 0 ? "habiles" : "corridos";

  return {
    dias: tipo === "mixto" ? null : bolsas[tipo],
    tipo,
    diasPorTipo: bolsas,
    caso: "cambioConvenio",
    desglose: {
      convenioAnterior,
      diasAnterior: propAnt,
      tipoAnterior: formatoAnt,
      mesesAnterior: mesesConvenioAnterior,
      convenioNuevo,
      diasNuevo: propNuevo,
      tipoNuevo: formatoActual,
      mesesNuevo: mesesConvenioNuevo,
    },
  };
}

/**
 * Función principal unificada: decide qué caso aplicar y devuelve el resultado.
 * @param {object} params
 * @param {object}  params.perfilActual       — tipoCargo, particion y categoria del legajo
 * @param {string}  params.fechaIngreso        — "yyyy-mm-dd"
 * @param {number}  params.anioVacacional
 * @param {boolean} [params.esReingreso]
 * @param {string}  [params.fechaReingreso]    — "yyyy-mm-dd", requerido si esReingreso=true
 * @param {boolean} [params.esCambioConvenio]
 * @param {object}  [params.perfilAnterior]   — requerido si esCambioConvenio=true
 * @param {number}  [params.mesesConvenioAnterior]
 * @param {number}  [params.mesesConvenioNuevo]
 */
export function calcularVacaciones(params) {
  const {
    fechaIngreso,
    anioVacacional,
    esReingreso = false,
    fechaReingreso = null,
    esCambioConvenio = false,
    mesesConvenioAnterior = 0,
    mesesConvenioNuevo = 0,
    perfilActual,
    perfilAnterior,
  } = params;
  const anio = Number(anioVacacional);
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2099) throw new Error("Ingresá un año vacacional válido.");
  const ingreso = parseFechaLocal(fechaIngreso);
  const referencia = new Date(anio, 11, 31);
  if (!ingreso || ingreso > referencia) throw new Error("La fecha de ingreso debe ser válida y no superar el año vacacional.");
  const regimen = exigirRegimen(perfilActual || {}, "actual");
  const convenio = regimen.convenio;
  const antiguedad = calcularAntiguedad(ingreso, referencia);
  if (esReingreso && esCambioConvenio) throw new Error("Registrá reingreso o cambio de régimen, uno por vez.");
  if (esCambioConvenio) {
    const anterior = exigirRegimen(perfilAnterior || {}, "anterior");
    const ant = Number(mesesConvenioAnterior);
    const nuevo = Number(mesesConvenioNuevo);
    if ([mesesConvenioAnterior, mesesConvenioNuevo].some(v => v === "" || v == null)
      || ![ant, nuevo].every(m => Number.isInteger(m) && m >= 0 && m <= 12)) {
      throw new Error("Completá los meses de cada situación con valores enteros entre 0 y 12.");
    }
    const mesesEsperados = ingreso.getFullYear() === anio ? calcularMesesTrabajados(fechaIngreso, anio) : 12;
    if (ant + nuevo !== mesesEsperados || ant + nuevo === 0) {
      throw new Error(`Los meses de ambas situaciones deben sumar ${mesesEsperados} para este período.`);
    }
    const resultado = calcularDiasCambioConvenio({ convenioAnterior: anterior.convenio, convenioNuevo: convenio,
      mesesConvenioAnterior: ant, mesesConvenioNuevo: nuevo, antiguedad,
      tipoAnterior: anterior.tipo, tipoNuevo: regimen.tipo });
    return { ...resultado, antiguedad, regimen, regimenAnterior: anterior, perfilActual, perfilAnterior,
      label: "Proporcional por cambio de categoría, planta o convenio" };
  }
  let resultado;
  if (esReingreso && fechaReingreso) {
    const reingreso = parseFechaLocal(fechaReingreso);
    if (!reingreso || reingreso < ingreso || reingreso.getFullYear() !== anio) {
      throw new Error("La fecha de reingreso debe pertenecer al año vacacional y ser posterior al ingreso original.");
    }
    const antiguedadAlReingreso = calcularAntiguedad(ingreso, reingreso);
    const mesesTrabajados = calcularMesesTrabajados(fechaReingreso, anioVacacional);
    resultado = calcularDiasReingreso({ convenio, antiguedadAlReingreso, mesesTrabajados });
  } else {
    if (esReingreso) throw new Error("Completá la fecha de reingreso.");
    resultado = calcularDiasNormal({ convenio, fechaIngreso, anioVacacional: anio });
  }
  return { ...resultado, antiguedad, tipo: regimen.tipo,
    diasPorTipo: { habiles: regimen.tipo === "habiles" ? resultado.dias : 0, corridos: regimen.tipo === "corridos" ? resultado.dias : 0 },
    regimen, perfilActual };
}

// ─────────────────────────────────────────────
// CÁLCULO DE DÍAS EN UN RANGO DE FECHAS
// ─────────────────────────────────────────────

/**
 * Feriados nacionales fijos de Argentina (dd-MM).
 * Se evalúan cada año.
 */
const FERIADOS_FIJOS = [
  "01-01", // Año Nuevo
  "24-03", // Día de la Memoria
  "02-04", // Malvinas
  "01-05", // Día del Trabajador
  "25-05", // Revolución de Mayo
  "20-06", // Paso a la Inmortalidad del Gral. Belgrano
  "09-07", // Independencia
  "17-08", // Paso a la Inmortalidad del Gral. San Martín (3er lunes de agosto — se trata como fijo al 17)
  "12-10", // Día del Respeto a la Diversidad Cultural (2do lunes de octubre — se trata como fijo al 12)
  "20-11", // Día de la Soberanía Nacional (4to lunes de noviembre — se trata como fijo al 20)
  "08-12", // Inmaculada Concepción
  "25-12", // Navidad
];

/**
 * Devuelve true si la fecha es feriado nacional fijo.
 * @param {Date} date
 */
function esFeriadoFijo(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return FERIADOS_FIJOS.includes(`${dd}-${mm}`);
}

/**
 * Cuenta los días hábiles entre dos fechas (inclusive ambos extremos).
 * Excluye sábados, domingos y feriados nacionales fijos.
 * @param {string} desde — "yyyy-mm-dd"
 * @param {string} hasta — "yyyy-mm-dd"
 * @param {string[]} [feriadosExtra] — feriados adicionales en formato "yyyy-mm-dd"
 * @returns {number}
 */
export function contarDiasHabiles(desde, hasta, feriadosExtra = []) {
  const inicio = parseFechaLocal(desde);
  const fin    = parseFechaLocal(hasta);
  if (!inicio || !fin || inicio > fin) return 0;

  const extrasSet = new Set(feriadosExtra);
  let count = 0;
  const cur = new Date(inicio);

  while (cur <= fin) {
    const dow = cur.getDay(); // 0=Dom, 6=Sáb
    const isoStr = cur.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !esFeriadoFijo(cur) && !extrasSet.has(isoStr)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Cuenta los días corridos entre dos fechas (inclusive ambos extremos).
 * @param {string} desde — "yyyy-mm-dd"
 * @param {string} hasta — "yyyy-mm-dd"
 * @returns {number}
 */
export function contarDiasCorridos(desde, hasta) {
  const inicio = parseFechaLocal(desde);
  const fin    = parseFechaLocal(hasta);
  if (!inicio || !fin || inicio > fin) return 0;
  const diff = fin.getTime() - inicio.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Dado un convenio y un rango de fechas, devuelve los días que consume ese rango
 * según el tipo del convenio (hábiles o corridos).
 * @param {string} convenio
 * @param {string} desde — "yyyy-mm-dd"
 * @param {string} hasta — "yyyy-mm-dd"
 * @param {string[]} [feriadosExtra]
 * @returns {{ diasRango: number, tipo: string }}
 */
export function calcularDiasRango(convenio, desde, hasta, feriadosExtra = []) {
  const tipo = ["habiles", "corridos"].includes(convenio) ? convenio : TABLAS_CONVENIO[convenio]?.tipo;
  if (!tipo) throw new Error(`Régimen de días desconocido: ${convenio}`);
  const diasRango = tipo === "habiles"
    ? contarDiasHabiles(desde, hasta, feriadosExtra)
    : contarDiasCorridos(desde, hasta);
  return { diasRango, tipo };
}

export function consumoVacacional(solicitud) {
  const tipo = solicitud.tipoDias;
  const cantidad = Number(solicitud.diasSolicitados);
  if (!["habiles", "corridos"].includes(tipo) || !Number.isInteger(cantidad) || cantidad < 0) {
    throw new Error(`La solicitud ${solicitud.nroSolicitud || solicitud.id || "histórica"} no tiene un formato de días válido. RRHH debe revisarla antes de calcular el saldo.`);
  }
  return { habiles: tipo === "habiles" ? cantidad : 0, corridos: tipo === "corridos" ? cantidad : 0 };
}

export function calcularSaldoVacacional(diasPorTipo, solicitudes) {
  const usadas = { habiles: 0, corridos: 0 };
  const aprobadas = solicitudes.filter(s => s.estado === "aprobada");
  for (const solicitud of aprobadas) {
    const consumo = consumoVacacional(solicitud);
    usadas.habiles += consumo.habiles;
    usadas.corridos += consumo.corridos;
  }
  const porTipo = {};
  for (const tipo of ["habiles", "corridos"]) {
    const total = diasPorTipo?.[tipo] ?? 0;
    if (!Number.isInteger(total) || total < 0) throw new Error("El saldo del régimen no es válido.");
    porTipo[tipo] = { diasCorresponden: total, diasUsados: usadas[tipo], diasDisponibles: Math.max(0, total - usadas[tipo]) };
  }
  return { porTipo, solicitudesAnteriores: aprobadas };
}
