import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as calculo from "../src/utils/vacacionesCalculo.mjs";
import * as regimen from "../src/utils/regimenVacaciones.mjs";

// SDK simulado, con reintentos optimistas y commit atómico. No usa Firebase real.
async function servicio(seed = {}) {
  const datos = new Map(Object.entries(seed).map(([key, value]) => [key, structuredClone(value)]));
  const versiones = new Map();
  const db = {};
  let siguiente = 0;
  const snapshot = ref => ({ exists: () => datos.has(ref.path), data: () => structuredClone(datos.get(ref.path)), id:ref.path.split("/").at(-1) });
  const sinUndefined = objeto => {
    for (const [key, value] of Object.entries(objeto)) {
      assert.notEqual(value, undefined, `Campo no serializable en Firestore: ${key}`);
      if (value && typeof value === "object") sinUndefined(value);
    }
  };
  const guardar = (ref, payload, merge) => {
    sinUndefined(payload);
    datos.set(ref.path, structuredClone(merge ? { ...datos.get(ref.path), ...payload } : payload));
    versiones.set(ref.path, (versiones.get(ref.path) || 0) + 1);
  };
  const sdk = {
    collection: (_,path) => ({path}),
    doc: (base,...paths) => ({path:[base.path,...paths].filter(Boolean).join("/")}),
    where: (field,operator,value) => ({field,operator,value}),
    orderBy: () => ({}),
    query: (ref,...filtros) => ({...ref,filtros}),
    getDoc: async ref => snapshot(ref),
    getDocs: async ref => {
      const docs = [...datos].filter(([key,value]) => key.startsWith(`${ref.path}/`) && (ref.filtros || []).every(f=> !f.field || value[f.field] === f.value))
        .map(([path]) => ({...snapshot({path}),ref:{path}}));
      return {docs,size:docs.length};
    },
    serverTimestamp: () => "timestamp-del-servidor",
    addDoc: async (ref,payload) => {
      const doc = {path:`${ref.path}/nueva-${++siguiente}`};
      guardar(doc,payload,false);
      return {id:doc.path.split("/").at(-1)};
    },
    runTransaction: async (_,callback) => {
      for (let intento=0;intento<5;intento++) {
        const leidas = new Map();
        const escrituras = [];
        const transaction = {
          get: async ref => { leidas.set(ref.path, versiones.get(ref.path) || 0); return snapshot(ref); },
          update: (ref,value) => escrituras.push([ref,value,true]),
          set: (ref,value) => escrituras.push([ref,value,false]),
        };
        const resultado = await callback(transaction);
        if ([...leidas].some(([key,version])=>version !== (versiones.get(key) || 0))) continue;
        escrituras.forEach(([ref,value,merge])=>guardar(ref,value,merge));
        return resultado;
      }
      throw new Error("Demasiados conflictos de transacción");
    },
  };
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports)) this.setExport(key,value);});
  const modules = {"./api":synthetic({SEGURIDAD_ACTIVA:false,llamarApi:()=>{throw new Error('API no esperada');}}),"firebase/firestore":synthetic(sdk),"../firebase":synthetic({db}),"./vacacionesCalculo.mjs":synthetic(calculo),"./regimenVacaciones.mjs":synthetic(regimen)};
  const source = readFileSync(new URL("../src/utils/vacaciones.js",import.meta.url),"utf8");
  const module = new vm.SourceTextModule(source);
  await module.link(specifier=>modules[specifier]);
  await module.evaluate();
  return {api:module.namespace,datos};
}

const perfilActual = {tipoCargo:"temporario",particion:"municipal",categoria:"COORDINADOR DIRECCION 40 HS"};
const parametros = {perfilActual,fechaIngreso:"2015-01-01",anioVacacional:2026,legajo:"123",nombreCompleto:"Agente de prueba",area:"Edilicio",tipoDias:"corridos",diasSolicitados:7,fechaDesde:"2027-01-04",fechaHasta:"2027-01-10"};
const solicitud = (tipo,dias,extras={}) => ({legajo:"123",anioVacacional:2026,estado:"pendiente",versionRegimen:2,diasPorTipo:{habiles:14,corridos:14},diasCorresponden:14,tipoDias:tipo,diasSolicitados:dias,...extras});

test("guardar recalcula por categoría, persiste la unidad y no descuenta antes de aprobar",async()=>{
  const {api,datos} = await servicio();
  const creada = await api.crearSolicitudVacaciones(parametros);
  assert.equal(creada.tipoDias,"corridos");
  assert.equal(creada.diasCorresponden,28);
  assert.equal(creada.diasSolicitados,7);
  assert.equal(creada.categoria,perfilActual.categoria);
  assert.equal(creada.estado,"pendiente");
  assert.equal(datos.has("saldosVacaciones/vacaciones_123_2026"),false);
});

test("guardar vuelve a consultar el saldo y rechaza sobreconsumo o conteos alterados",async()=>{
  const {api} = await servicio({"solicitudesVacaciones/vieja":solicitud("corridos",25,{estado:"aprobada"})});
  await assert.rejects(api.crearSolicitudVacaciones(parametros),/Sólo quedan 3/);
  await assert.rejects(api.crearSolicitudVacaciones({...parametros,diasSolicitados:5}),/conteo de la licencia/);
});

test("una categoría con formato municipal único permite guardar conservando la planta del agente", async () => {
  const { api } = await servicio({
    "solicitudesVacaciones/usada": solicitud("habiles", 3, { estado: "aprobada" }),
  });
  const creada = await api.crearSolicitudVacaciones({
    ...parametros,
    perfilActual: { tipoCargo: "permanente", particion: "municipal", categoria: "TECNICO CAT 6 35 HS" },
    fechaIngreso: "2010-08-01",
    tipoDias: "habiles",
    diasSolicitados: 5,
  });
  assert.equal(creada.tipoCargo, "permanente");
  assert.equal(creada.tipoDias, "habiles");
  assert.equal(creada.diasCorresponden, 28);
  const resuelta = await api.actualizarEstadoSolicitud(creada.id, "aprobada");
  assert.equal(resuelta.saldoRestante, 20);
});

test("una solicitud hábil previa descuenta el rango corregido al aprobar y conserva lo solicitado", async () => {
  const { api, datos } = await servicio({
    "solicitudesVacaciones/preexistente": solicitud("habiles", 5, {
      fechaDesde: "2026-11-09",
      fechaHasta: "2026-11-13",
    }),
  });
  const aprobada = await api.actualizarEstadoSolicitud("preexistente", "aprobada");
  assert.equal(aprobada.diasSolicitados, 5);
  assert.equal(aprobada.diasDescontados, 3);
  assert.equal(aprobada.saldoRestante, 11);
  assert.equal(datos.get("saldosVacaciones/vacaciones_123_2026").diasUsadosPorTipo.habiles, 3);
  const disponible = await api.fetchDiasDisponibles("123", 2026, { habiles: 14, corridos: 14 });
  assert.equal(disponible.porTipo.habiles.diasDisponibles, 11);
});

test("primera aprobación reconstruye un saldo antiguo sin mezclar las unidades",async()=>{
  const {api,datos} = await servicio({
    "solicitudesVacaciones/hist-h":solicitud("habiles",5,{estado:"aprobada",versionRegimen:1}),
    "solicitudesVacaciones/hist-c":solicitud("corridos",2,{estado:"aprobada",versionRegimen:1}),
    "solicitudesVacaciones/nueva":solicitud("corridos",3),
    "saldosVacaciones/vacaciones_123_2026":{diasUsados:7},
  });
  await api.actualizarEstadoSolicitud("nueva","aprobada");
  const saldo = datos.get("saldosVacaciones/vacaciones_123_2026");
  assert.deepEqual(saldo.diasUsadosPorTipo,{habiles:5,corridos:5});
  assert.deepEqual(saldo.diasDisponiblesPorTipo,{habiles:9,corridos:9});
  await api.actualizarEstadoSolicitud("nueva","aprobada");
  assert.deepEqual(datos.get("saldosVacaciones/vacaciones_123_2026").diasUsadosPorTipo,{habiles:5,corridos:5});
});

test("dos aprobaciones simultáneas no pueden agotar dos veces el mismo saldo",async()=>{
  const {api,datos} = await servicio({
    "solicitudesVacaciones/uno":solicitud("corridos",10),
    "solicitudesVacaciones/dos":solicitud("corridos",10),
  });
  const resultados = await Promise.allSettled([api.actualizarEstadoSolicitud("uno","aprobada"),api.actualizarEstadoSolicitud("dos","aprobada")]);
  assert.equal(resultados.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(datos.get("saldosVacaciones/vacaciones_123_2026").diasUsadosPorTipo.corridos,10);
  assert.equal([...datos.values()].filter(s=>s.estado==="aprobada").length,1);
});

test("aprobaciones simultáneas de tipos distintos conservan ambos descuentos",async()=>{
  const {api,datos} = await servicio({
    "solicitudesVacaciones/uno":solicitud("habiles",5),
    "solicitudesVacaciones/dos":solicitud("corridos",3),
  });
  await Promise.all([api.actualizarEstadoSolicitud("uno","aprobada"),api.actualizarEstadoSolicitud("dos","aprobada")]);
  assert.deepEqual(datos.get("saldosVacaciones/vacaciones_123_2026").diasUsadosPorTipo,{habiles:5,corridos:3});
});

test("rechazar no escribe saldos y una resolución aprobada no se revierte",async()=>{
  const {api,datos} = await servicio({"solicitudesVacaciones/pendiente":solicitud("habiles",5),"solicitudesVacaciones/aprobada":solicitud("habiles",4,{estado:"aprobada"})});
  await api.actualizarEstadoSolicitud("pendiente","rechazada");
  assert.equal(datos.has("saldosVacaciones/vacaciones_123_2026"),false);
  await assert.rejects(api.actualizarEstadoSolicitud("aprobada","rechazada"),/pendiente/);
});

const anterior = {tipoCargo:"permanente",particion:"municipal",categoria:"ADMINISTRATIVO CAT 5 35 HS"};
const cambio = { ...parametros, perfilAnterior:anterior, esCambioConvenio:true, mesesConvenioAnterior:6,mesesConvenioNuevo:6 };
const historicaCambio = solicitud("corridos",3,{...cambio,estado:"aprobada",diasSolicitados:3,nroSolicitud:"VAC-2026-00001",calculoDetalle:calculo.calcularVacaciones(cambio)});

test("una nueva solicitud conserva el proporcional ya aprobado aunque se omita la casilla",async()=>{
  const {api} = await servicio({"solicitudesVacaciones/cambio":historicaCambio});
  const plan = await api.fetchPlanVacacional("123",2026);
  assert.equal(plan.mesesConvenioAnterior,6);
  const creada = await api.crearSolicitudVacaciones(parametros);
  assert.equal(creada.esCambioConvenio,true);
  assert.equal(creada.diasCorresponden,14);
  assert.equal(creada.mesesConvenioNuevo,6);
  await assert.rejects(api.crearSolicitudVacaciones({...parametros,fechaHasta:"2027-01-20",diasSolicitados:17}),/Sólo quedan 11/);
});

test("una pendiente vieja con derecho anual completo no sobrepasa el proporcional aprobado después",async()=>{
  const {api,datos} = await servicio({
    "solicitudesVacaciones/cambio":historicaCambio,
    "solicitudesVacaciones/pendiente":solicitud("corridos",20,{perfilActual,esCambioConvenio:false,diasPorTipo:{habiles:0,corridos:28},calculoDetalle:calculo.calcularVacaciones(parametros)}),
  });
  await assert.rejects(api.actualizarEstadoSolicitud("pendiente","aprobada"),/quedan 11/);
  assert.equal(datos.get("solicitudesVacaciones/pendiente").estado,"pendiente");
});
