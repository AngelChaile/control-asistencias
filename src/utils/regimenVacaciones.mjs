// Identificación exacta del régimen por las tres columnas de la planilla de RRHH.
// No deduce cantidades anuales ni convierte días hábiles en corridos.
export function normalizarDescripcion(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-").trim();
}

export function normalizarPlanta(valor) {
  const texto = normalizarDescripcion(valor);
  return ({
    PERMANENTE: "PLANTA PERMANENTE",
    CONTRATADO: "DOCENTES PROVISIONALES",
    "DOCENTES PROVICIONALES": "DOCENTES PROVISIONALES",
    "DOCENTE PROVISIONAL": "DOCENTES PROVISIONALES",
    "PLANTA TEMPORARIA": "TEMPORARIO",
    TEMPORARIA: "TEMPORARIO",
  })[texto] || texto;
}

export function normalizarParticion(valor) {
  const texto = normalizarDescripcion(valor);
  return ({
    MUNICIPAL: "CARRERA MUNICIPAL",
    DOCENTE: "CARRERA DOCENTE",
    MEDICO: "CARRERA MEDICA",
    MEDICA: "CARRERA MEDICA",
  })[texto] || texto;
}

export function mismoPerfilVacacional(a, b) {
  return !!a && !!b && normalizarPlanta(a.tipoCargo) === normalizarPlanta(b.tipoCargo)
    && normalizarParticion(a.particion) === normalizarParticion(b.particion)
    && normalizarDescripcion(a.categoria) === normalizarDescripcion(b.categoria);
}

export function buscarRegimenVacacional(agente, reglas) {
  const tipoCargo = normalizarPlanta(agente.tipoCargo);
  const particion = normalizarParticion(agente.particion);
  const categoria = normalizarDescripcion(agente.categoria);
  const faltantes = [
    !tipoCargo && "tipo de cargo / planta",
    !particion && "partición",
    !categoria && "categoría",
  ].filter(Boolean);
  if (faltantes.length) return { encontrado: false, motivo: "datos_incompletos", faltantes };

  const coincidencias = reglas.filter(regla => (
    normalizarPlanta(regla.tipoCargo) === tipoCargo
    && normalizarParticion(regla.particion) === particion
    && normalizarDescripcion(regla.categoria) === categoria
  ));
  if (!coincidencias.length) return { encontrado: false, motivo: "sin_regla", faltantes: [] };
  const tipos = new Set(coincidencias.map(regla => regla.tipo));
  if (tipos.size !== 1 || !["habiles", "corridos"].includes(coincidencias[0].tipo)) {
    throw new Error("La planilla contiene reglas incompatibles para esta planta, partición y categoría.");
  }
  const regla = coincidencias[0];
  return {
    encontrado: true,
    tipo: regla.tipo,
    descripcion: regla.tipo === "habiles" ? "Días hábiles" : "Días corridos",
    tipoCargo: regla.tipoCargo,
    particion: regla.particion,
    categoria: regla.categoria,
    filaFuente: regla.fila,
  };
}
