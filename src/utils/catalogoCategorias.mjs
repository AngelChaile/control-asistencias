import catalogo from "../data/vacacionesCategorias.json" with { type: "json" };
import { normalizarDescripcion, normalizarParticion } from "./regimenVacaciones.mjs";

// Categorías informadas para el padrón. El grupo sólo organiza el selector.
const adicionales = [
  ["DIRECTOR COMPRAS 40 HS", "Autoridades y conducción"],
  ["GUARDIA MEDICA", "Médicas"],
  ["JORNALERO", "Otras categorías"],
  ["PASANTIA FORMACION POLICIA", "Pasantías"],
  ["VICE-DIRECTOR JARDIN MATERNAL", "Docentes"],
];

const familias = {
  ADMINISTRATIVO: "Administrativo",
  OBRERO: "Obrero",
  PROFESIONAL: "Profesional",
  SERVICIO: "Servicio",
  SISTEMAS: "Sistemas",
  TECNICO: "Técnico",
};

function grupoDeRegla({ categoria, particion }) {
  const familia = normalizarDescripcion(categoria).match(/^(\w+) CAT \d+/)?.[1];
  if (familias[familia]) return familias[familia];
  if (categoria.startsWith("PASANTIA ")) return "Pasantías";
  if (/^(TEMP )?ASESOR /.test(categoria)) return "Asesorías";
  const carrera = normalizarParticion(particion);
  if (carrera === "CARRERA DOCENTE") return "Docentes";
  if (carrera === "CARRERA MEDICA") return "Médicas";
  return "Autoridades y conducción";
}

const opciones = new Map();
for (const [nombre, grupo] of [
  ...catalogo.reglas.map(regla => [regla.categoria, grupoDeRegla(regla)]),
  ...adicionales,
]) {
  const clave = normalizarDescripcion(nombre);
  if (!opciones.has(clave)) opciones.set(clave, { nombre, grupo });
}

const collator = new Intl.Collator("es-AR", { numeric: true, sensitivity: "base" });
const grupos = new Map();
for (const { nombre, grupo } of opciones.values()) {
  if (!grupos.has(grupo)) grupos.set(grupo, []);
  grupos.get(grupo).push(nombre);
}

export const CATEGORIAS_POR_GRUPO = [...grupos]
  .sort(([a], [b]) => collator.compare(a, b))
  .map(([grupo, categorias]) => ({ grupo, categorias: categorias.sort(collator.compare) }));

export function categoriaDelCatalogo(valor) {
  return opciones.get(normalizarDescripcion(valor))?.nombre;
}
