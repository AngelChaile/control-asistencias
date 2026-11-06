import {
  collection, addDoc, getDoc, getDocs, query, where, orderBy, doc,
  runTransaction, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { mismoPerfilVacacional } from "./regimenVacaciones.mjs";
import { calcularVacaciones, calcularDiasRango, calcularSaldoVacacional, consumoVacacional, diasParaAprobar, parseFechaLocal } from "./vacacionesCalculo.mjs";
export * from "./vacacionesCalculo.mjs";
import { llamarApi, SEGURIDAD_ACTIVA } from './api';

async function generarNroSolicitud(anio) {
  if (SEGURIDAD_ACTIVA) return (await llamarApi('vacaciones-contexto', { accion: 'numero', anio })).numero;
  const snap = await getDocs(query(collection(db, "solicitudesVacaciones"), where("anioVacacional", "==", anio), orderBy("createdAt", "desc")));
  return `VAC-${anio}-${String(snap.size + 1).padStart(5, "0")}`;
}

async function solicitudesDelPeriodo(legajo, anio) {
  if (SEGURIDAD_ACTIVA) return (await llamarApi('vacaciones-contexto', { accion: 'historial', legajo: String(legajo).trim() })).solicitudes.filter(s => Number(s.anioVacacional) === Number(anio));
  const snap = await getDocs(query(collection(db, "solicitudesVacaciones"), where("legajo", "==", String(legajo).trim())));
  return snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(s => Number(s.anioVacacional) === Number(anio));
}

function planDeSolicitud(solicitud) {
  if (solicitud.versionRegimen !== 2 || !solicitud.perfilActual) return null;
  return { perfilActual: solicitud.perfilActual, perfilAnterior: solicitud.perfilAnterior || null,
    esCambioConvenio: !!solicitud.esCambioConvenio, esReingreso: !!solicitud.esReingreso,
    fechaReingreso: solicitud.fechaReingreso || null,
    mesesConvenioAnterior: Number(solicitud.mesesConvenioAnterior) || 0,
    mesesConvenioNuevo: Number(solicitud.mesesConvenioNuevo) || 0,
    diasPorTipo: solicitud.diasPorTipo, calculoDetalle: solicitud.calculoDetalle,
    nroSolicitud: solicitud.nroSolicitud || "" };
}

function planAprobado(solicitudes) {
  const fecha = s => s.fechaAprobacion?.toMillis?.() || (s.fechaAprobacion?.seconds || 0) * 1000;
  const candidatas = solicitudes.filter(s => s.estado === "aprobada" && s.versionRegimen === 2 && s.perfilActual && (s.esCambioConvenio || s.esReingreso));
  candidatas.sort((a,b) => fecha(b) - fecha(a) || String(b.nroSolicitud || "").localeCompare(String(a.nroSolicitud || "")));
  return candidatas.length ? planDeSolicitud(candidatas[0]) : null;
}

export async function fetchPlanVacacional(legajo, anio) {
  return planAprobado(await solicitudesDelPeriodo(legajo, anio));
}

export async function fetchDiasDisponibles(legajo, anioVacacional, diasPorTipo) {
  return calcularSaldoVacacional(diasPorTipo, await solicitudesDelPeriodo(legajo, anioVacacional));
}

export async function crearSolicitudVacaciones(datos) {
  const legajo = String(datos.legajo || "").trim();
  if (!legajo || !datos.nombreCompleto?.trim()) throw new Error("Completá el legajo y el nombre del agente.");
  const anio = Number(datos.anioVacacional);
  const historicas = await solicitudesDelPeriodo(legajo, anio);
  const plan = planAprobado(historicas);
  // Al volver a solicitar, conservar el proporcional aprobado del año.
  if (plan && !datos.esCambioConvenio && !datos.esReingreso) {
    if (!mismoPerfilVacacional(plan.perfilActual, datos.perfilActual)) throw new Error("El año tiene un régimen especial aprobado para otra situación. Completá los cambios del período antes de solicitar.");
    datos = { ...datos, perfilAnterior: plan.perfilAnterior, esCambioConvenio: plan.esCambioConvenio,
      mesesConvenioAnterior: plan.mesesConvenioAnterior, mesesConvenioNuevo: plan.mesesConvenioNuevo,
      esReingreso: plan.esReingreso, fechaReingreso: plan.fechaReingreso };
  }
  const resultado = calcularVacaciones(datos);
  const tipo = datos.tipoDias || resultado.tipo;
  if (!["habiles", "corridos"].includes(tipo)) throw new Error("Elegí de qué saldo se descontará esta licencia.");
  const dias = calcularDiasRango(tipo, datos.fechaDesde, datos.fechaHasta).diasRango;
  if (!parseFechaLocal(datos.fechaDesde) || !parseFechaLocal(datos.fechaHasta) || dias < 1) throw new Error("Seleccioná un rango válido de licencia.");
  if (Number(datos.diasSolicitados) !== dias) throw new Error("El conteo de la licencia cambió. Volvé a calcular antes de guardar.");
  const saldo = calcularSaldoVacacional(resultado.diasPorTipo, historicas);
  if (dias > saldo.porTipo[tipo].diasDisponibles) throw new Error(`Sólo quedan ${saldo.porTipo[tipo].diasDisponibles} días ${tipo === "habiles" ? "hábiles" : "corridos"} disponibles. Volvé a consultar el saldo.`);
  const docData = {
    nroSolicitud: await generarNroSolicitud(anio),
    legajo,
    nombreCompleto: datos.nombreCompleto.trim(),
    cargo: datos.perfilActual.categoria || "",
    categoria: datos.perfilActual.categoria || "",
    tipoCargo: datos.perfilActual.tipoCargo || "",
    particion: datos.perfilActual.particion || "",
    area: datos.area || "",
    convenio: resultado.regimen.convenio,
    esJerarquico: resultado.regimen.convenio === "Municipal" && resultado.regimen.tipo === "corridos",
    fechaIngreso: datos.fechaIngreso,
    anioVacacional: anio,
    versionRegimen: 2,
    diasCorresponden: resultado.diasPorTipo[tipo],
    diasPorTipo: resultado.diasPorTipo,
    tipoDias: tipo,
    diasSolicitados: dias,
    consumoPorTipo: { habiles: tipo === "habiles" ? dias : 0, corridos: tipo === "corridos" ? dias : 0 },
    fechaDesde: datos.fechaDesde,
    fechaHasta: datos.fechaHasta,
    estado: "pendiente",
    observaciones: datos.observaciones || "",
    solicitadoPor: datos.solicitadoPor || "",
    esReingreso: !!datos.esReingreso,
    fechaReingreso: datos.esReingreso ? datos.fechaReingreso : null,
    esCambioConvenio: !!datos.esCambioConvenio,
    perfilActual: datos.perfilActual,
    perfilAnterior: datos.esCambioConvenio ? datos.perfilAnterior : null,
    convenioAnterior: resultado.desglose?.convenioAnterior || null,
    mesesConvenioAnterior: Number(datos.mesesConvenioAnterior) || 0,
    mesesConvenioNuevo: Number(datos.mesesConvenioNuevo) || 0,
    calculoDetalle: resultado,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "solicitudesVacaciones"), docData);
  return { ...docData, id: ref.id };
}

export async function fetchSolicitudesVacaciones({ legajo = "", area = "", anio = null, estado = "" } = {}) {
  const constraints = [];
  if (anio) constraints.push(where("anioVacacional", "==", Number(anio)));
  if (estado) constraints.push(where("estado", "==", estado));
  const snap = await getDocs(query(collection(db, "solicitudesVacaciones"), ...constraints, orderBy("createdAt", "desc")));
  let rows = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  if (legajo) rows = rows.filter(r => String(r.legajo || "").toLowerCase().includes(legajo.trim().toLowerCase()));
  if (area) rows = rows.filter(r => String(r.area || "").toLowerCase().includes(area.trim().toLowerCase()));
  return rows;
}

function diasOtorgados(solicitud) {
  // Las solicitudes anteriores se descuentan del tipo que tenían al aprobarse.
  if (solicitud.versionRegimen === 2 && solicitud.diasPorTipo) return solicitud.diasPorTipo;
  if (!["habiles", "corridos"].includes(solicitud.tipoDias)) throw new Error("La solicitud histórica no tiene un tipo de días definido. RRHH debe revisarla.");
  return { habiles: solicitud.tipoDias === "habiles" ? Number(solicitud.diasCorresponden) : 0,
    corridos: solicitud.tipoDias === "corridos" ? Number(solicitud.diasCorresponden) : 0 };
}

export async function actualizarEstadoSolicitud(id, estado, observaciones = "") {
  if (!["aprobada", "rechazada"].includes(estado)) throw new Error("Estado de solicitud no válido.");
  const ref = doc(db, "solicitudesVacaciones", id);
  const inicial = await getDoc(ref);
  if (!inicial.exists()) throw new Error("La solicitud de vacaciones ya no existe.");
  const datos = inicial.data();
  const historicas = estado === "aprobada" && datos.estado !== "aprobada"
    ? (await solicitudesDelPeriodo(datos.legajo, datos.anioVacacional)).filter(s => s.id !== id) : [];
  const usadasHistoricas = calcularSaldoVacacional({ habiles: 0, corridos: 0 }, historicas).porTipo;
  const saldoRef = doc(db, "saldosVacaciones", `vacaciones_${String(datos.legajo)}_${Number(datos.anioVacacional)}`);
  return runTransaction(db, async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("La solicitud de vacaciones ya no existe.");
    const solicitud = snap.data();
    if (solicitud.estado === estado) return solicitud;
    if (solicitud.estado !== "pendiente") throw new Error("Sólo se puede resolver una solicitud pendiente.");
    if (estado === "rechazada") {
      transaction.update(ref, { estado, observaciones, fechaRechazo: serverTimestamp(), updatedAt: serverTimestamp() });
      return { ...solicitud, estado };
    }
    const saldoSnap = await transaction.get(saldoRef);
    const saldoAnterior = saldoSnap.exists() ? saldoSnap.data() : null;
    // El documento por legajo/año serializa todas las aprobaciones, de ambos tipos.
    // En la primera aprobación V2 se reconstruyen las bolsas desde el historial.
    const usadas = saldoAnterior?.versionRegimen === 2 ? { ...saldoAnterior.diasUsadosPorTipo }
      : { habiles: usadasHistoricas.habiles.diasUsados, corridos: usadasHistoricas.corridos.diasUsados };
    if (![usadas.habiles, usadas.corridos].every(n => Number.isInteger(n) && n >= 0)) throw new Error("El saldo guardado está incompleto. RRHH debe revisarlo.");
    const planPrevio = saldoAnterior?.planVacacional || planAprobado(historicas);
    const planPropio = planDeSolicitud(solicitud);
    if (planPrevio && planPropio && !solicitud.esCambioConvenio && !solicitud.esReingreso
      && !mismoPerfilVacacional(planPrevio.perfilActual, planPropio.perfilActual)) {
      throw new Error("La situación de esta solicitud no coincide con el régimen ya aprobado del año. Revisá los cambios antes de aprobar.");
    }
    const plan = planPropio && (solicitud.esCambioConvenio || solicitud.esReingreso)
      ? planPropio : planPrevio || planPropio;
    const otorgados = plan?.diasPorTipo || diasOtorgados(solicitud);
    const tipo = solicitud.tipoDias;
    const cantidad = diasParaAprobar(solicitud);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw new Error("La solicitud debe incluir al menos un día de licencia. Revisá el rango antes de aprobar.");
    }
    const consumo = consumoVacacional({ ...solicitud, diasSolicitados: cantidad });
    const disponibles = Math.max(0, Number(otorgados[tipo]) - usadas[tipo]);
    if (!Number.isFinite(disponibles) || cantidad > disponibles) {
      throw new Error(`No se puede aprobar: quedan ${disponibles || 0} días ${tipo === "habiles" ? "hábiles" : "corridos"} del período ${solicitud.anioVacacional}.`);
    }
    usadas.habiles += consumo.habiles;
    usadas.corridos += consumo.corridos;
    const restantes = { habiles: Math.max(0, Number(otorgados.habiles) - usadas.habiles), corridos: Math.max(0, Number(otorgados.corridos) - usadas.corridos) };
    const nuevoSaldo = { versionRegimen: 2, legajo: String(solicitud.legajo), anioVacacional: Number(solicitud.anioVacacional),
      diasUsadosPorTipo: usadas, diasCorrespondenPorTipo: otorgados, diasDisponiblesPorTipo: restantes,
      planVacacional: plan || null,
      tipoDias: tipo, diasUsados: usadas[tipo], diasCorresponden: Number(otorgados[tipo]), diasDisponibles: restantes[tipo], updatedAt: serverTimestamp() };
    if (saldoSnap.exists()) transaction.update(saldoRef, nuevoSaldo);
    else transaction.set(saldoRef, { ...nuevoSaldo, createdAt: serverTimestamp() });
    const ajustePlan = plan && solicitud.versionRegimen === 2 ? { perfilAnterior: plan.perfilAnterior,
      esCambioConvenio: plan.esCambioConvenio, esReingreso: plan.esReingreso, fechaReingreso: plan.fechaReingreso,
      mesesConvenioAnterior: plan.mesesConvenioAnterior, mesesConvenioNuevo: plan.mesesConvenioNuevo,
      calculoDetalle: plan.calculoDetalle } : {};
    transaction.update(ref, { ...ajustePlan, estado, observaciones, diasPorTipo: otorgados, diasCorresponden: Number(otorgados[tipo]), diasDescontados: cantidad, consumoPorTipo: consumo,
      saldoRestante: restantes[tipo], saldoRestantePorTipo: restantes, fechaAprobacion: serverTimestamp(), updatedAt: serverTimestamp() });
    return { ...solicitud, ...ajustePlan, estado, diasPorTipo: otorgados, diasCorresponden: Number(otorgados[tipo]),
      diasDescontados: cantidad, consumoPorTipo: consumo, saldoRestante: restantes[tipo], saldoRestantePorTipo: restantes };
  });
}
