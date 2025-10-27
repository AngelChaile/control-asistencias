/**
 * Devuelven arrays de objetos cuyas keys serán las columnas del .xlsx
 * - Reciben rows tal como vienen de Firestore / componentes (asistencias, ausencias, empleados, etc)
 * - Hacen fallback a '' cuando falta algún campo
 */

function safe(v) {
  return v === undefined || v === null ? "" : v;
}

export function formatRRHHAsistencias(rows = []) {
  return rows.map((r) => ({
    Legajo: safe(r.legajo),
    Nombre: safe(r.nombre),
    Apellido: safe(r.apellido),
    "Hora Fecha": `${safe(r.hora)} ${safe(r.fecha)}`.trim(),
    Secretaria: safe(r.secretaria) || safe(r.secretaria_admin) || "",
    "Lugar de Trabajo": safe(r.lugarTrabajo) || safe(r.lugar) || "",
  }));
}

export function formatRRHHAusencias(rows = []) {
  return rows.map((r) => ({
    Legajo: safe(r.legajo),
    Nombre: safe(r.nombre),
    Apellido: safe(r.apellido),
    Justificativo: safe(r.justificativo),
    Fecha: safe(r.fecha),
    Secretaria: safe(r.secretaria) || "",
    "Lugar de Trabajo": safe(r.lugarTrabajo) || safe(r.lugar) || "",
  }));
}

export function formatAdminAsistencias(rows = []) {
  return rows.map((r) => ({
    Legajo: safe(r.legajo),
    Nombre: safe(r.nombre),
    Apellido: safe(r.apellido),
    Hora: safe(r.hora),
    Fecha: safe(r.fecha),
  }));
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