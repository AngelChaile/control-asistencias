import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buscarRegimenVacacional } from "../src/utils/regimenVacaciones.mjs";

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

test("normaliza tildes, mayúsculas, espacios y los códigos de los formularios actuales", () => {
  assert.equal(buscarRegimenVacacional({ ...coordinador, categoria: "  coordinador  dirección 40 hs  " }, reglas).tipo, "corridos");
  assert.equal(buscarRegimenVacacional({ tipoCargo: "contratado", particion: "docente", categoria: "MAESTRA ESPECIALIZADA" }, reglas).tipo, "corridos");
  assert.equal(buscarRegimenVacacional({ tipoCargo: "interino", particion: "médico", categoria: "SUMS PRE- ASISTENTE 36 HS" }, reglas).tipo, "corridos");
});

test("no reemplaza la categoría por la función ni aplica una regla de otra planta", () => {
  assert.equal(buscarRegimenVacacional({ ...administrativo, categoria: "", funcion: administrativo.categoria }, reglas).motivo, "datos_incompletos");
  assert.equal(buscarRegimenVacacional({ ...administrativo, tipoCargo: "temporario" }, reglas).motivo, "sin_regla");
  assert.equal(buscarRegimenVacacional({ ...administrativo, categoria: "ADMINISTRATIVO CAT 99 35 HS" }, reglas).motivo, "sin_regla");
});

test("una ambigüedad nunca se resuelve eligiendo arbitrariamente el primer formato", () => {
  assert.throws(() => buscarRegimenVacacional(administrativo, [
    { ...administrativo, tipo: "habiles" }, { ...administrativo, tipo: "corridos" },
  ]), /incompatibles/);
});
