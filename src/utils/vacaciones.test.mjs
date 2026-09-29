import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Probar las funciones de cálculo sin inicializar Firebase ni acceder a la red.
const source = (await readFile(new URL("./vacaciones.js", import.meta.url), "utf8"))
  .replace(/import \{[\s\S]*?\} from "firebase\/firestore";/, "")
  .replace('import { db } from "../firebase";', "");
const {
  calcularVacaciones,
  calcularMesesTrabajados,
  TABLAS_CONVENIO,
} = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const base = {
  convenio: "Municipal",
  fechaIngreso: "2010-01-01",
  anioVacacional: 2026,
  esReingreso: true,
  fechaReingreso: "2026-05-01",
  fechaDesde: "2026-11-01",
};

test("Municipal: 16 años de antigüedad y seis meses desde el reingreso dan 14 días", () => {
  const resultado = calcularVacaciones(base);
  assert.equal(resultado.dias, 14);
  assert.equal(resultado.mesesTrabajados, 6);
  assert.equal(resultado.antiguedadAlReingreso, 16);
  assert.equal(resultado.caso, "reingreso");
});

test("el inicio de la licencia cambia la fila de la grilla", () => {
  assert.equal(calcularVacaciones({ ...base, fechaDesde: "2026-10-01" }).dias, 11);
  assert.equal(calcularVacaciones({ ...base, fechaDesde: "2026-12-01" }).dias, 16);
});

test("cuenta meses completos según el día del reingreso", () => {
  assert.equal(calcularMesesTrabajados("2026-05-15", 2026, "2026-11-14"), 5);
  assert.equal(calcularMesesTrabajados("2026-05-15", 2026, "2026-11-15"), 6);
  assert.equal(calcularMesesTrabajados("15/05/2026", 2026, "15/11/2026"), 6);
});

test("cada convenio y tramo usa su grilla para los doce meses", () => {
  for (const [convenio, tabla] of Object.entries(TABLAS_CONVENIO)) {
    tabla.tramos.forEach((tramo, indice) => {
      for (let mes = 1; mes <= 12; mes += 1) {
        const fechaDesde = mes === 12 ? "2027-01-01" : `2026-${String(mes + 1).padStart(2, "0")}-01`;
        const resultado = calcularVacaciones({
          ...base, convenio, fechaDesde,
          fechaIngreso: `${2026 - tramo.desde}-01-01`,
          fechaReingreso: "2026-01-01",
        });
        assert.equal(resultado.dias, tabla.grilla[mes - 1][indice]);
        assert.equal(resultado.mesesTrabajados, mes);
      }
    });
  }
});

test("un período distinto del reingreso conserva las vacaciones normales", () => {
  for (const anioVacacional of [2025, 2027]) {
    const resultado = calcularVacaciones({ ...base, anioVacacional, fechaDesde: null });
    assert.equal(resultado.caso, "normal");
    assert.equal(resultado.dias, 28);
  }
});

test("sin reingreso conserva los días anuales", () => {
  const resultado = calcularVacaciones({ ...base, esReingreso: false });
  assert.equal(resultado.caso, "normal");
  assert.equal(resultado.dias, 28);
});

test("una licencia posterior al período no acumula meses del año siguiente", () => {
  const resultado = calcularVacaciones({ ...base, fechaDesde: "2027-04-01" });
  assert.equal(resultado.mesesTrabajados, 8);
  assert.equal(resultado.dias, 18);
});

test("sin meses completos no asigna días de la primera fila", () => {
  const resultado = calcularVacaciones({ ...base, fechaDesde: "2026-05-20" });
  assert.equal(resultado.mesesTrabajados, 0);
  assert.equal(resultado.dias, 0);
});

test("requiere inicio de licencia y rechaza fechas anteriores al reingreso", () => {
  assert.throws(() => calcularVacaciones({ ...base, fechaDesde: null }), /inicio de la licencia/);
  assert.throws(() => calcularVacaciones({ ...base, fechaDesde: "2026-04-30" }), /antes del reingreso/);
  assert.throws(() => calcularVacaciones({ ...base, fechaReingreso: null }), /reingreso inválida/);
});
