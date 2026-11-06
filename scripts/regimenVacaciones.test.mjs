import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buscarRegimenVacacional } from "../src/utils/regimenVacaciones.mjs";
import { CATEGORIAS_POR_GRUPO, categoriaDelCatalogo } from "../src/utils/catalogoCategorias.mjs";

const { reglas } = JSON.parse(readFileSync(new URL("../src/data/vacacionesCategorias.json", import.meta.url), "utf8"));
const administrativo = { tipoCargo: "permanente", particion: "municipal", categoria: "ADMINISTRATIVO CAT 5 35 HS" };
const coordinador = { tipoCargo: "temporario", particion: "municipal", categoria: "COORDINADOR DIRECCION 40 HS" };

test("el catálogo conserva las 131 filas y todos los formatos de la planilla", () => {
  assert.equal(reglas.length, 131);
  assert.equal(reglas.filter(r => r.tipo === "habiles").length, 82);
  assert.equal(reglas.filter(r => r.tipo === "corridos").length, 49);
  for (const regla of reglas) {
    const encontrado = buscarRegimenVacacional(regla, reglas);
    assert.equal(encontrado.tipo, regla.tipo);
    assert.equal(encontrado.filaFuente, regla.fila);
  }
});

test("la categoría diferencia hábiles/corridos dentro de la misma carrera municipal", () => {
  assert.equal(buscarRegimenVacacional(administrativo, reglas).tipo, "habiles");
  assert.equal(buscarRegimenVacacional(coordinador, reglas).tipo, "corridos");
});

test("el selector conserva todas las categorías y ordena las familias por número de categoría", () => {
  const categorias = CATEGORIAS_POR_GRUPO.flatMap(g => g.categorias);
  assert.equal(categorias.length, 136);
  assert.equal(new Set(categorias).size, categorias.length);
  for (const regla of reglas) assert.ok(categorias.includes(regla.categoria));

  const administrativos = CATEGORIAS_POR_GRUPO.find(g => g.grupo === "Administrativo").categorias;
  const numeros = administrativos.map(c => Number(c.match(/CAT (\d+)/)[1]));
  assert.deepEqual(numeros, [...numeros].sort((a, b) => a - b));
  assert.equal(categoriaDelCatalogo("  Guardia   Médica  "), "GUARDIA MEDICA");
});

test("una categoría del selector sin regla sigue pendiente de clasificación", () => {
  for (const categoria of ["DIRECTOR COMPRAS 40 HS", "GUARDIA MEDICA", "JORNALERO", "PASANTIA FORMACION POLICIA", "VICE-DIRECTOR JARDIN MATERNAL"]) {
    assert.equal(categoriaDelCatalogo(categoria), categoria);
    const regimen = buscarRegimenVacacional({ ...administrativo, categoria }, reglas);
    assert.equal(regimen.motivo, "sin_regla");
    assert.deepEqual(regimen.referencias, []);
  }
});

test("normaliza tildes, mayúsculas, espacios y los códigos de los formularios actuales", () => {
  assert.equal(buscarRegimenVacacional({ ...coordinador, categoria: "  coordinador  dirección 40 hs  " }, reglas).tipo, "corridos");
  assert.equal(buscarRegimenVacacional({ tipoCargo: "contratado", particion: "docente", categoria: "MAESTRA ESPECIALIZADA" }, reglas).tipo, "corridos");
  assert.equal(buscarRegimenVacacional({ tipoCargo: "interino", particion: "médico", categoria: "SUMS PRE- ASISTENTE 36 HS" }, reglas).tipo, "corridos");
});

test("no reemplaza la categoría por la función ni toma un formato de otra partición", () => {
  assert.equal(buscarRegimenVacacional({ ...administrativo, categoria: "", funcion: administrativo.categoria }, reglas).motivo, "datos_incompletos");
  assert.equal(buscarRegimenVacacional({ ...administrativo, particion: "docente" }, reglas).motivo, "sin_regla");
  assert.equal(buscarRegimenVacacional({ ...administrativo, tipoCargo: "planta no reconocida" }, reglas).motivo, "sin_regla");
  assert.equal(buscarRegimenVacacional({ ...administrativo, categoria: "ADMINISTRATIVO CAT 99 35 HS" }, reglas).motivo, "sin_regla");
});

test("Técnico CAT 6 de planta permanente toma el formato municipal único sin cambiar la planta", () => {
  const regimen = buscarRegimenVacacional({ ...administrativo, categoria: "TECNICO CAT 6 35 HS" }, reglas);
  assert.equal(regimen.tipo, "habiles");
  assert.equal(regimen.tipoCargo, "PLANTA PERMANENTE");
  assert.equal(regimen.plantaFuente, "TEMPORARIO");
  assert.equal(regimen.filaFuente, 122);
  assert.equal(regimen.coincidencia, "categoria_particion");
});

test("si el formato depende de la planta, sólo se acepta la combinación exacta", () => {
  const ejemplo = [
    { ...administrativo, tipo: "habiles" },
    { ...administrativo, tipoCargo: "temporario", tipo: "corridos" },
    { ...coordinador, tipoCargo: "interino", tipo: "corridos" },
  ];
  assert.equal(buscarRegimenVacacional(administrativo, ejemplo).tipo, "habiles");
  assert.equal(buscarRegimenVacacional({ ...administrativo, tipoCargo: "temporario" }, ejemplo).tipo, "corridos");
  assert.equal(buscarRegimenVacacional({ ...administrativo, tipoCargo: "interino" }, ejemplo).motivo, "sin_regla");
});

test("una ambigüedad nunca se resuelve eligiendo arbitrariamente el primer formato", () => {
  assert.throws(() => buscarRegimenVacacional(administrativo, [
    { ...administrativo, tipo: "habiles" }, { ...administrativo, tipo: "corridos" },
  ]), /incompatibles/);
});
