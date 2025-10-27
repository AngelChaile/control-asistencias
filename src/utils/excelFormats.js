/**
 * Devuelven arrays de objetos cuyas keys serán las columnas del .xlsx
 * - Reciben rows tal como vienen de Firestore / componentes (asistencias, ausencias, empleados, etc)
 * - Hacen fallback a '' cuando falta algún campo
 */

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
    "Hora Fecha": `${safe(r.hora)} ${safe(r.fecha)}`.trim(),
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