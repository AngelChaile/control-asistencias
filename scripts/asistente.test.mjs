import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { alcanceAsistente, buscarEnConvenio, filtrarPersonal, fechaRegistro, rankingAusencias } from "../src/utils/asistenteConsultas.mjs";

const municipal = JSON.parse(readFileSync(new URL("../src/data/convenios/municipal.json", import.meta.url), "utf8"));
const medico = JSON.parse(readFileSync(new URL("../src/data/convenios/medico.json", import.meta.url), "utf8"));

test("permisos: RRHH y Subsecretaría tienen consulta global; admin sólo su área", () => {
  assert.deepEqual(alcanceAsistente({ rol: "rrhh" }), { personal: true, area: null });
  assert.deepEqual(alcanceAsistente({ rol: "subsecretario" }), { personal: true, area: null });
  assert.deepEqual(alcanceAsistente({ rol: "admin", lugarTrabajo: "Edilicio" }), { personal: true, area: "Edilicio" });
  for (const rol of ["empleado", "coordinador_traspasos", "admin", "inventado"]) {
    assert.equal(alcanceAsistente({ rol }).personal, false);
  }
});

test("casamiento encuentra el artículo de matrimonio y su página original", () => {
  const [resultado] = buscarEnConvenio(municipal, "¿Cuántos días corresponden por casamiento?");
  assert.equal(resultado.articulo, 39);
  assert.deepEqual(resultado.paginas, [19]);
  assert.match(resultado.texto, /quince \(15\)/);
});

test("enfermedad prioriza el encabezado específico y se puede buscar por número", () => {
  assert.equal(buscarEnConvenio(municipal, "artículo para pedir enfermedad")[0].articulo, 33);
  assert.equal(buscarEnConvenio(municipal, "Artículo 39").length, 1);
  assert.deepEqual(buscarEnConvenio(municipal, "Artículo 9999"), []);
  assert.deepEqual(buscarEnConvenio(municipal, "zxqvunknown"), []);
});

test("el OCR médico cita páginas sin inventar números de artículos", () => {
  const resultados = buscarEnConvenio(medico, "casamiento");
  assert.ok(resultados.some(r => r.paginas.includes(21)));
  assert.ok(resultados.every(r => r.articulo === undefined));
  assert.equal(medico.paginas.length, 26);
  assert.ok(medico.paginas.every(p => p.texto.length > 100));
});

test("personal combina situación, área, localidad y función sin incluir inactivos", () => {
  const filas = [
    { id: "1", tipoCargo: "temporario", lugarTrabajo: "Edilicio", localidad: "Morón", funcion: "Pintor", activo: true },
    { id: "2", tipoCargo: "temporario", lugarTrabajo: "Contaduría", localidad: "Morón", funcion: "Pintor" },
    { id: "3", tipoCargo: "permanente", lugarTrabajo: "Edilicio", localidad: "Morón", funcion: "Pintor" },
    { id: "4", tipoCargo: "temporario", lugarTrabajo: "Edilicio", localidad: "Morón", funcion: "Pintor", activo: false },
  ];
  assert.deepEqual(filtrarPersonal(filas, { tipoCargo: "temporario", area: "edilicio", localidad: "moron", funcion: "pintor" }).map(r => r.id), ["1"]);
});

test("una calle llamada Morón no se considera localidad de residencia", () => {
  assert.equal(filtrarPersonal([{ domicilio: "Morón 123, Castelar" }], { localidad: "Morón" }).length, 0);
});

test("fechas válidas en ambos formatos; rechaza desbordamientos de calendario", () => {
  assert.equal(fechaRegistro("1/11/2026"), "2026-11-01");
  assert.equal(fechaRegistro("2026-11-01"), "2026-11-01");
  assert.equal(fechaRegistro("31/02/2026"), null);
});

test("ranking cuenta fechas únicas, mes y área, conserva empates y no deduce ausencias", () => {
  const reg = (legajo, fecha, area = "Edilicio") => ({ legajo, fecha, lugarTrabajo: area, nombre: `Agente ${legajo}` });
  const datos = rankingAusencias([
    reg("1", "01/11/2026"), reg("1", "2026-11-01"), reg("1", "02/11/2026"),
    reg("2", "01/11/2026"), reg("2", "03/11/2026"),
    reg("3", "01/11/2026", "Contaduría"), reg("1", "01/10/2026"),
    reg("4", "inválida"), reg("", "01/11/2026"),
  ], { mes: "2026-11", area: "Edilicio" });
  assert.equal(datos.totalDias, 4);
  assert.deepEqual(datos.filas.map(r => r.dias), [2, 2]);
  assert.equal(datos.sinFecha, 1);
  assert.equal(datos.sinLegajo, 1);
});
