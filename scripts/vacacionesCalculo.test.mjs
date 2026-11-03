import test from "node:test";
import assert from "node:assert/strict";
import { calcularVacaciones, calcularDiasRango, calcularMesesTrabajados, calcularSaldoVacacional, perfilVacacionalEmpleado } from "../src/utils/vacacionesCalculo.mjs";

export const administrativo = { tipoCargo: "permanente", particion: "municipal", categoria: "ADMINISTRATIVO CAT 5 35 HS" };
export const coordinador = { tipoCargo: "temporario", particion: "municipal", categoria: "COORDINADOR DIRECCION 40 HS" };
export const docente = { tipoCargo: "contratado", particion: "docente", categoria: "MAESTRA ESPECIALIZADA" };
const base = { perfilActual: administrativo, fechaIngreso: "2015-01-01", anioVacacional: 2026 };

test("misma cantidad municipal por antigüedad, con el formato de cada categoría", () => {
  for (const [ingreso, dias] of [["2022-01-01",14],["2021-01-01",21],["2017-01-01",21],["2016-01-01",28],["2007-01-01",28],["2006-01-01",35]]) {
    const habiles = calcularVacaciones({ ...base, fechaIngreso: ingreso });
    const corridos = calcularVacaciones({ ...base, fechaIngreso: ingreso, perfilActual: coordinador });
    assert.deepEqual(habiles.diasPorTipo, { habiles: dias, corridos: 0 });
    assert.deepEqual(corridos.diasPorTipo, { habiles: 0, corridos: dias });
  }
});

test("cambio de categoría dentro de Municipal conserva dos bolsas sin sumar unidades", () => {
  const resultado = calcularVacaciones({ ...base, perfilActual: coordinador, perfilAnterior: administrativo, esCambioConvenio:true, mesesConvenioAnterior:6, mesesConvenioNuevo:6 });
  assert.deepEqual(resultado.diasPorTipo, { habiles:14, corridos:14 });
  assert.equal(resultado.tipo,"mixto");
  assert.equal(resultado.dias,null);
});

test("cambio Municipal a Docente aplica la escala y el tipo de cada convenio", () => {
  const resultado = calcularVacaciones({ ...base, perfilActual: docente, perfilAnterior: administrativo, esCambioConvenio:true, mesesConvenioAnterior:6, mesesConvenioNuevo:6 });
  assert.deepEqual(resultado.diasPorTipo, { habiles:14, corridos:15 });
});

test("redondeo al entero más cercano en cada tramo, como confirmó RRHH", () => {
  const resultado = calcularVacaciones({ ...base, fechaIngreso:"2021-01-01", perfilActual:coordinador, perfilAnterior:administrativo, esCambioConvenio:true, mesesConvenioAnterior:6, mesesConvenioNuevo:6 });
  assert.deepEqual(resultado.diasPorTipo,{habiles:11,corridos:11});
});

test("rechaza meses vacíos, negativos, fraccionados o con suma distinta al período", () => {
  for (const [anterior,actual] of [["",6],[-1,13],[6.5,5.5],[6,7],[5,6]]) {
    assert.throws(()=>calcularVacaciones({ ...base, perfilActual:coordinador, perfilAnterior:administrativo, esCambioConvenio:true, mesesConvenioAnterior:anterior, mesesConvenioNuevo:actual }));
  }
});

test("escalas médicas y docentes existentes siguen vigentes", () => {
  assert.equal(calcularVacaciones({...base,perfilActual:{tipoCargo:"permanente",particion:"medico",categoria:"SUMS A 24 HS"}}).dias,30);
  assert.equal(calcularVacaciones({...base,perfilActual:docente}).dias,30);
  assert.equal(calcularVacaciones({...base,perfilActual:docente,fechaIngreso:"2000-01-01"}).dias,40);
});

test("el régimen explícito de radiólogos conserva los 50 corridos configurados", () => {
  const resultado = calcularVacaciones({...base,perfilActual:{tipoCargo:"permanente",particion:"radiologo",categoria:""}});
  assert.deepEqual(resultado.diasPorTipo,{habiles:0,corridos:50});
  assert.equal(resultado.regimen.filaFuente,null);
});

test("primer año y reingreso no pierden diciembre ni conceden días sin meses completos", () => {
  assert.equal(calcularMesesTrabajados("2026-01-01",2026),12);
  assert.equal(calcularMesesTrabajados("2026-07-01",2026),6);
  assert.equal(calcularMesesTrabajados("2026-12-15",2026),0);
  assert.equal(calcularVacaciones({...base,fechaIngreso:"2026-07-01"}).dias,7);
  assert.equal(calcularVacaciones({...base,esReingreso:true,fechaReingreso:"2026-12-15"}).dias,0);
});

test("un rango consume hábiles o corridos aunque ambos pertenezcan a Municipal", () => {
  assert.equal(calcularDiasRango("habiles","2027-01-04","2027-01-10").diasRango,5);
  assert.equal(calcularDiasRango("corridos","2027-01-04","2027-01-10").diasRango,7);
});

test("el saldo descuenta sólo aprobadas y respeta la unidad de solicitudes históricas", () => {
  const saldo = calcularSaldoVacacional({habiles:14,corridos:14},[
    {estado:"aprobada",tipoDias:"habiles",diasSolicitados:4},
    {estado:"aprobada",tipoDias:"corridos",diasSolicitados:3},
    {estado:"pendiente",tipoDias:"habiles",diasSolicitados:10},
    {estado:"rechazada",tipoDias:"corridos",diasSolicitados:7},
  ]);
  assert.equal(saldo.porTipo.habiles.diasDisponibles,10);
  assert.equal(saldo.porTipo.corridos.diasDisponibles,11);
  assert.equal(saldo.solicitudesAnteriores.length,2);
});

test("saldo agotado en un tipo no se traslada al otro ni se convierte", () => {
  const saldo = calcularSaldoVacacional({habiles:7,corridos:7},[{estado:"aprobada",tipoDias:"habiles",diasSolicitados:10}]);
  assert.equal(saldo.porTipo.habiles.diasDisponibles,0);
  assert.equal(saldo.porTipo.corridos.diasDisponibles,7);
});

test("datos históricos incompatibles o fechas inválidas detienen el cálculo", () => {
  assert.throws(()=>calcularSaldoVacacional({habiles:14,corridos:0},[{estado:"aprobada",diasSolicitados:4}]),/histórica/);
  assert.throws(()=>calcularVacaciones({...base,fechaIngreso:"2026-02-31"}),/fecha de ingreso/);
  assert.throws(()=>calcularVacaciones({...base,perfilActual:{...coordinador,categoria:"Desconocida"}}),/no figura/);
});

test("el legajo usa la categoría aunque la función sea diferente", () => {
  const perfil = perfilVacacionalEmpleado({...administrativo,funcion:"Coordinador"});
  assert.equal(perfil.categoria,administrativo.categoria);
});
