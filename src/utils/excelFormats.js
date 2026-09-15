/**
 * Devuelven arrays de objetos cuyas keys serán las columnas del .xlsx
 * - Reciben rows tal como vienen de Firestore / componentes (asistencias, ausencias, empleados, etc)
 * - Hacen fallback a '' cuando falta algún campo
 */

import { formatearHora24 } from "./fechas";

function safe(v) {
  return v === undefined || v === null ? "" : v;
}

// helper para intentar diferentes nombres de campo
function pickSecretaria(r) {
  return (
    r.secretaria ||
    r.secretaria_admin ||
    r.secretariaAdmin ||
    r.secretary ||
    (r.empleado && (r.empleado.secretaria || r.empleado.secretaria_admin)) ||
    ""
  );
}
function pickLugar(r) {
  return (
    r.lugarTrabajo ||
    r.lugar ||
    r.area ||
    r.lugar_de_trabajo ||
    (r.empleado && (r.empleado.lugarTrabajo || r.empleado.lugar)) ||
    ""
  );
}

export function formatRRHHAsistencias(rows = []) {
  return rows.map((r) => ({
    Legajo: safe(r.legajo),
    Nombre: safe(r.nombre),
    Apellido: safe(r.apellido),
    Tipo: safe(r.tipo), // entrada / salida
    "Hora Fecha": `${formatearHora24(r.hora)} ${safe(r.fecha)}`.trim(),
    Secretaria: safe(pickSecretaria(r)),
    "Lugar de Trabajo": safe(pickLugar(r)),
  }));
}

export function formatRRHHAusencias(rows = []) {
  return rows.map((r) => ({
    Legajo: safe(r.legajo),
    Nombre: safe(r.nombre),
    Apellido: safe(r.apellido),
    Justificativo: safe(r.justificativo),
    Fecha: safe(r.fecha),
    Secretaria: safe(pickSecretaria(r)),
    "Lugar de Trabajo": safe(pickLugar(r)),
  }));
}

export function formatAdminAsistencias(rows = []) {
  return rows.map((r) => ({
    Legajo: safe(r.legajo),
    Nombre: safe(r.nombre),
    Apellido: safe(r.apellido),
    Tipo: safe(r.tipo), // agrego Tipo para Admin también
    Hora: formatearHora24(r.hora),
    Fecha: safe(r.fecha),
  }));
}

const FERIADOS_FIJOS = {
  "01-01": "Año Nuevo",
  "03-24": "Día Nacional de la Memoria por la Verdad y la Justicia",
  "04-02": "Día del Veterano y de los Caídos en la Guerra de Malvinas",
  "05-01": "Día del Trabajador",
  "05-25": "Día de la Revolución de Mayo",
  "06-20": "Paso a la Inmortalidad del General Manuel Belgrano",
  "07-09": "Día de la Independencia",
  "08-17": "Paso a la Inmortalidad del General José de San Martín",
  "10-12": "Día del Respeto a la Diversidad Cultural",
  "11-20": "Día de la Soberanía Nacional",
  "12-08": "Inmaculada Concepción de María",
  "12-25": "Navidad"
};

function fechaRegistro(valor) {
  if (valor?.toDate) return valor.toDate();
  if (valor instanceof Date) return valor;
  const texto = String(valor || "").trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const local = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (local) return new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]));
  return null;
}

function fechaRegistroSegura(valor) {
  const fecha = fechaRegistro(valor);
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
}

function pascua(anio) {
  const fecha = new Date(anio, 2, 21);
  const ciclo = (fecha) => {
    const a = fecha.getFullYear() % 19;
    const b = Math.floor(fecha.getFullYear() / 100);
    const c = fecha.getFullYear() % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(fecha.getFullYear(), mes, dia);
  };
  return ciclo(fecha);
}

function feriadoDe(fecha) {
  const clave = `${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  if (FERIADOS_FIJOS[clave]) return FERIADOS_FIJOS[clave];
  const pascuaFecha = pascua(fecha.getFullYear());
  const diferencia = Math.round((fecha - pascuaFecha) / 86400000);
  if (diferencia === -48) return "Carnaval";
  if (diferencia === -47) return "Carnaval";
  if (diferencia === -2) return "Viernes Santo";
  return "";
}

function textoDia(fecha) {
  if (feriadoDe(fecha)) return "FER";
  if (fecha.getDay() === 6) return "SAB";
  if (fecha.getDay() === 0) return "DOM";
  return "";
}

function fechaBase(rows, desde) {
  const referencia = desde || new Date();
  return new Date(referencia.getFullYear(), referencia.getMonth(), 1);
}

// src/utils/excelFormats.js - Versión CORREGIDA

export function formatAsistenciasMensuales(rows = [], { desde = null } = {}) {
  const inicio = fechaBase(rows, desde);
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
  const dias = Array.from({ length: fin.getDate() }, (_, indice) => new Date(inicio.getFullYear(), inicio.getMonth(), indice + 1));
  const empleados = new Map();

  rows.forEach((row) => {
    const fecha = fechaRegistroSegura(row.fecha);
    if (!fecha || fecha.getFullYear() !== inicio.getFullYear() || fecha.getMonth() !== inicio.getMonth()) return;
    const legajo = String(row.legajo || "");
    const id = legajo || `${row.nombre || ""}-${row.apellido || ""}`;
    if (!empleados.has(id)) {
      empleados.set(id, { Legajo: safe(row.legajo), Nombre: safe(row.nombre), Apellido: safe(row.apellido), Área: safe(pickLugar(row)) });
    }
    const empleado = empleados.get(id);
    const dia = String(fecha.getDate()).padStart(2, "0");
    const hora = formatearHora24(row.hora);
    const registrosDelDia = empleado.__registros || (empleado.__registros = {});
    const registros = registrosDelDia[dia] || (registrosDelDia[dia] = { entradas: [], salidas: [] });
    if (String(row.tipo || "").toUpperCase() === "SALIDA") registros.salidas.push(hora);
    else registros.entradas.push(hora);
  });

  // ✅ Devolver un array de arrays (AOA) con el orden exacto
  const resultado = [];
  // Encabezados
  const encabezados = ["Legajo", "Nombre", "Apellido", "Área"];
  dias.forEach(fecha => {
    encabezados.push(String(fecha.getDate()).padStart(2, "0"));
  });
  resultado.push(encabezados);

  // Filas de datos
  empleados.forEach((empleado) => {
    const fila = [
      empleado.Legajo,
      empleado.Nombre,
      empleado.Apellido,
      empleado.Área
    ];
    dias.forEach((fecha) => {
      const dia = String(fecha.getDate()).padStart(2, "0");
      const etiqueta = textoDia(fecha);
      const registros = empleado.__registros?.[dia];
      if (registros) {
        const entrada = registros.entradas.sort()[0] || "";
        const salida = registros.salidas.sort().at(-1) || "";
        fila.push([entrada, salida].filter(Boolean).join(" - "));
      } else {
        fila.push(etiqueta);
      }
    });
    resultado.push(fila);
  });

  return resultado; // ← Ahora devuelve un array de arrays
}

export function formatAdminAusencias(rows = []) {
  return rows.map((r) => ({
    Legajo: safe(r.legajo),
    Nombre: safe(r.nombre),
    Apellido: safe(r.apellido),
    Justificativo: safe(r.justificativo),
    Fecha: safe(r.fecha),
  }));
}