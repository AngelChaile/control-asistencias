import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp as clienteApp, deleteApp as borrarApp } from 'firebase/app';
import * as web from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { fichaje } from '../server/fichaje.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as calculo from '../src/utils/vacacionesCalculo.mjs';
import * as regimen from '../src/utils/regimenVacaciones.mjs';
import { vacacionesContexto } from '../server/vacaciones-contexto.mjs';
import { usuarios } from '../server/usuarios.mjs';

const host=process.env.FIRESTORE_EMULATOR_HOST;
web.setLogLevel('silent'); // Los rechazos esperados se verifican con asserts.
if (!/^127\.0\.0\.1:[0-9]+$/.test(host || '')) throw new Error('Estas pruebas requieren FIRESTORE_EMULATOR_HOST=127.0.0.1:8085; nunca usan producción.');
const projectId='demo-asistencias';
const app=initializeApp({projectId},'reglas');
const db=getFirestore(app);
const clientes=[];
const cliente=(uid)=>{
  const app=clienteApp({projectId,apiKey:'demo'},`cliente-${uid || 'publico'}-${clientes.length}`); clientes.push(app);
  const firestore=web.getFirestore(app);
  const [hostname,port]=host.split(':');
  web.connectFirestoreEmulator(firestore,hostname,Number(port),uid ? {mockUserToken:{sub:uid,email:`${uid}@example.com`}} : {});
  return firestore;
};
let rrhh,admin,otro,sub,publico,agente;
const denegado=promesa=>assert.rejects(promesa,e=>e.code==='permission-denied');
const identidad={verifyIdToken:async token=>({uid:token,email:`${token}@example.com`})};
const aprobaciones={rrhh:{estado:'pendiente',fecha:null,observaciones:null},subsecretaria:{estado:'pendiente',fecha:null,observaciones:null}};
before(async()=>{
  await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`,{method:'DELETE'});
  // Carga las reglas del árbol de trabajo; también comprueba su compilación.
  const res=await fetch(`http://${host}/emulator/v1/projects/${projectId}:securityRules`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules:{files:[{name:'firestore.rules',content:readFileSync('firestore.rules','utf8')}]}})});
  assert.equal(res.status,200,await res.text());
  const seed={
    'users/rrhh':{rol:'rrhh'},'users/sub':{rol:'subsecretario'},'users/admin':{rol:'admin',lugarTrabajo:'A'},'users/otro':{rol:'admin',lugarTrabajo:'B'},'users/agente':{rol:'empleado'},
    'users/deshabilitado':{rol:'rrhh',activo:false},
    'empleados/empA':{legajo:'123',nombre:'Agente',apellido:'Uno',lugarTrabajo:'A',rol:'empleado',categoria:'Categoría',activo:true,documento:'privado'},
    'empleados/empB':{legajo:'456',nombre:'Otro',apellido:'Agente',lugarTrabajo:'B',activo:true},
    'asistencias/historica':{legajo:'123',lugarTrabajo:'A',tipo:'SALIDA',createdAt:Timestamp.fromDate(new Date('2026-11-03T18:00:00Z'))},
    'tokens/viejo-id':{token:'QR-IMPRESO-ANTERIOR',expiresAt:'2027-12-01T00:00:00Z',area:'A'},
    'notificaciones/propia':{usuarioId:'admin',mensaje:'Prueba',leido:false},
    'solicitudesVacaciones/historial':{area:'B',legajo:'123',estado:'aprobada',anioVacacional:2026,tipoDias:'corridos',diasSolicitados:2},
  };
  await Promise.all(Object.entries(seed).map(([path,data])=>db.doc(path).set(data)));
  rrhh=cliente('rrhh'); admin=cliente('admin'); otro=cliente('otro'); sub=cliente('sub'); publico=cliente(); agente=cliente('agente');
});
after(async()=>{await Promise.all(clientes.map(borrarApp));await deleteApp(app);});

test('sin sesión no se pueden leer ni escribir empleados, tokens, asistencias, perfiles ni módulos internos',async()=>{
  for(const collection of ['empleados','tokens','asistencias','users','areas','ausencias','solicitudes_traspaso','solicitudesVacaciones','saldosVacaciones','notificaciones','notificaciones_email','_fichajeEstado']) {
    await denegado(web.getDocs(web.collection(publico,collection)));
    await denegado(web.setDoc(web.doc(publico,collection,'intruso'),{rol:'rrhh'}));
  }
});
test('un admin consulta su área y no puede consultar todos los empleados ni otra área',async()=>{
  const propios=await web.getDocs(web.query(web.collection(admin,'empleados'),web.where('lugarTrabajo','==','A')));
  assert.equal(propios.size,1);
  await denegado(web.getDocs(web.collection(admin,'empleados')));
  await denegado(web.getDoc(web.doc(admin,'empleados','empB')));
  await denegado(web.getDocs(web.collection(agente,'empleados')));
  assert.equal((await web.getDocs(web.collection(rrhh,'empleados'))).size,2);
});
test('el perfil propio se puede leer pero ni RRHH ni el interesado pueden cambiar roles desde el SDK',async()=>{
  assert.equal((await web.getDoc(web.doc(admin,'users','admin'))).data().rol,'admin');
  await denegado(web.getDocs(web.collection(admin,'users')));
  await denegado(web.updateDoc(web.doc(admin,'users','admin'),{rol:'rrhh'}));
  await denegado(web.updateDoc(web.doc(rrhh,'users','admin'),{rol:'rrhh'}));
  await denegado(web.getDocs(web.collection(cliente('deshabilitado'),'empleados')));
});
test('el admin edita datos de su empleado pero no cambia destino, categoría, historial ni legajo',async()=>{
  await web.updateDoc(web.doc(admin,'empleados','empA'),{telefono:'123'});
  for(const data of [{lugarTrabajo:'B'},{legajo:'456'},{historialTraspasos:[]},{categoria:'Otra categoría'}]) await denegado(web.updateDoc(web.doc(admin,'empleados','empA'),data));
  await denegado(web.updateDoc(web.doc(admin,'empleados','empB'),{telefono:'123'}));
  await denegado(web.addDoc(web.collection(admin,'asistencias'),{legajo:'123'}));
  await denegado(web.deleteDoc(web.doc(rrhh,'asistencias','historica')));
});
test('el destinatario sólo puede leer su aviso y marcarlo como leído',async()=>{
  assert.equal((await web.getDocs(web.query(web.collection(admin,'notificaciones'),web.where('usuarioId','==','admin')))).size,1);
  await denegado(web.getDoc(web.doc(otro,'notificaciones','propia')));
  await denegado(web.updateDoc(web.doc(admin,'notificaciones','propia'),{mensaje:'Falso'}));
  await web.updateDoc(web.doc(admin,'notificaciones','propia'),{leido:true});
  await denegado(web.addDoc(web.collection(admin,'notificaciones'),{usuarioId:'otro',mensaje:'Falso'}));
});
test('las solicitudes respetan las dos aprobaciones; un admin no puede crearlas aprobadas ni aprobarlas',async()=>{
  const datos={tipoSolicitud:'traspaso_individual',empleadoId:'empA',empleado:{legajo:'123',areaOrigen:{nombre:'A'}},areaDestino:{nombre:'B'},creadoPor:'admin@example.com',aprobaciones,estado:'pendiente',createdAt:web.serverTimestamp(),updatedAt:web.serverTimestamp()};
  const ref=await web.addDoc(web.collection(admin,'solicitudes_traspaso'),datos);
  await denegado(web.addDoc(web.collection(admin,'solicitudes_traspaso'),{...datos,estado:'finalizado'}));
  await denegado(web.addDoc(web.collection(admin,'solicitudes_traspaso'),{...datos,empleadoId:'empB',empleado:{legajo:'456'}}));
  await denegado(web.updateDoc(web.doc(admin,'solicitudes_traspaso',ref.id),{estado:'rrhh_aprobado'}));
  await denegado(web.updateDoc(web.doc(sub,'solicitudes_traspaso',ref.id),{estado:'subsecretaria_aprobado'}));
  await web.updateDoc(web.doc(rrhh,'solicitudes_traspaso',ref.id),{'aprobaciones.rrhh.estado':'aprobado','aprobaciones.rrhh.fecha':web.serverTimestamp(),estado:'rrhh_aprobado',updatedAt:web.serverTimestamp()});
  await denegado(web.updateDoc(web.doc(rrhh,'solicitudes_traspaso',ref.id),{'aprobaciones.subsecretaria.estado':'aprobado',estado:'subsecretaria_aprobado'}));
  await web.updateDoc(web.doc(sub,'solicitudes_traspaso',ref.id),{'aprobaciones.subsecretaria.estado':'aprobado',estado:'subsecretaria_aprobado',updatedAt:web.serverTimestamp()});
  await web.updateDoc(web.doc(sub,'solicitudes_traspaso',ref.id),{estado:'finalizado',fechaEjecucion:web.serverTimestamp(),updatedAt:web.serverTimestamp()});
  await denegado(web.getDocs(web.collection(admin,'solicitudes_traspaso')));
  assert.equal((await web.getDocs(web.query(web.collection(admin,'solicitudes_traspaso'),web.where('creadoPor','==','admin@example.com')))).size,1);
});
test('el saldo es privado de RRHH/Subsecretaría y admin no puede resolver vacaciones',async()=>{
  await denegado(web.getDoc(web.doc(admin,'solicitudesVacaciones','historial')));
  await denegado(web.setDoc(web.doc(admin,'saldosVacaciones','vacaciones_123_2026'),{diasDisponibles:999}));
  await denegado(web.updateDoc(web.doc(admin,'solicitudesVacaciones','historial'),{estado:'aprobada'}));
});
test('el servicio real de vacaciones puede crear y aprobar con las reglas activas y descontar ambos tipos',async()=>{
  const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value);});
  const modules={'firebase/firestore':synthetic(web),'../firebase':synthetic({db:rrhh}),'./api':synthetic({SEGURIDAD_ACTIVA:false,llamarApi:()=>{throw new Error('No corresponde');}}),'./vacacionesCalculo.mjs':synthetic(calculo),'./regimenVacaciones.mjs':synthetic(regimen)};
  const mod=new vm.SourceTextModule(readFileSync('src/utils/vacaciones.js','utf8')); await mod.link(s=>modules[s]);await mod.evaluate();
  const creada=await mod.namespace.crearSolicitudVacaciones({perfilActual:{tipoCargo:'temporario',particion:'municipal',categoria:'COORDINADOR DIRECCION 40 HS'},fechaIngreso:'2015-01-01',anioVacacional:2026,legajo:'123',nombreCompleto:'Agente Uno',area:'A',tipoDias:'corridos',diasSolicitados:7,fechaDesde:'2027-01-04',fechaHasta:'2027-01-10',solicitadoPor:'rrhh'});
  const aprobada=await mod.namespace.actualizarEstadoSolicitud(creada.id,'aprobada');
  assert.equal(aprobada.saldoRestante,19);
  assert.equal((await db.doc('saldosVacaciones/vacaciones_123_2026').get()).data().diasUsadosPorTipo.corridos,9);
});
test('API acepta QR impresos, devuelve sólo datos mínimos, ignora datos falsificados y es idempotente',async()=>{
  let now=new Date('2026-11-04T12:00:00Z');
  const req={headers:{'x-real-ip':'prueba-fichaje'}};
  const s={db,FieldValue,Timestamp};
  const base={token:'QR-IMPRESO-ANTERIOR',legajo:'123'};
  assert.deepEqual(await fichaje(req,{accion:'validar',...base},s,()=>now),{valido:true});
  const busqueda=await fichaje(req,{accion:'buscar',...base},s,()=>now);
  assert.deepEqual(Object.keys(busqueda.empleado).sort(),['apellido','legajo','lugarTrabajo','nombre']);
  const cuerpo={accion:'fichar',...base,operacionId:'operacion-123456789',tipo:'SALIDA',fecha:'falsa',hora:'falsa',nombre:'falso'};
  const primera=await fichaje(req,cuerpo,s,()=>now);
  assert.equal(primera.tipo,'ENTRADA');assert.equal(primera.hora,'09:00');assert.notEqual(primera.empleado.nombre,'falso');
  assert.deepEqual(await fichaje(req,cuerpo,s,()=>now),primera);
  await assert.rejects(fichaje(req,{...cuerpo,operacionId:'operacion-999999999'},s,()=>now),{status:409});
  now=new Date('2026-11-04T18:00:00Z');
  const salida=await fichaje(req,{...cuerpo,operacionId:'operacion-222222222'},s,()=>now);
  assert.equal(salida.tipo,'SALIDA');
  await db.doc('tokens/viejo-id').update({disabled:true});
  await assert.rejects(fichaje(req,cuerpo,s,()=>now),{status:403});
  await db.doc('tokens/viejo-id').update({disabled:false});
});
test('dos fichadas simultáneas se serializan y los límites sobreviven a otra instancia',async()=>{
  const now=new Date('2026-11-05T12:00:00Z');
  const req={headers:{'x-real-ip':'concurrencia'}};
  const body={accion:'fichar',token:'QR-IMPRESO-ANTERIOR',legajo:'123'};
  const results=await Promise.allSettled(['1111111111111111','2222222222222222'].map(operacionId=>fichaje(req,{...body,operacionId},{db,FieldValue,Timestamp},()=>now)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  const ventana=Math.floor(now.getTime()/300000);
  const key=createHash('sha256').update('concurrencia').digest('hex');
  await db.doc(`_fichajeLimites/${key}`).set({cantidad:1200,ventana});
  await assert.rejects(fichaje(req,{accion:'validar',token:body.token},{db,FieldValue,Timestamp},()=>now),{status:429});
});
test('el contexto de vacaciones incluye consumos anteriores sólo para el área actual y asigna números únicos',async()=>{
  const s={db,FieldValue,Timestamp,auth:identidad};
  const req=uid=>({headers:{authorization:`Bearer ${uid}`}});
  const historial=await vacacionesContexto(req('admin'),{accion:'historial',legajo:'123'},s);
  assert.ok(historial.solicitudes.some(s=>s.area==='B'));
  await assert.rejects(vacacionesContexto(req('otro'),{accion:'historial',legajo:'123'},s),{status:403});
  const numeros=await Promise.all([1,2].map(()=>vacacionesContexto(req('admin'),{accion:'numero',anio:2026},s)));
  assert.notEqual(numeros[0].numero,numeros[1].numero);
});
test('API de cuentas crea Auth y perfil con el mismo UID, rechaza Admin y no almacena ni devuelve contraseñas',async()=>{
  const cuentas=new Map();
  const auth={...identidad,
    createUser:async datos=>{cuentas.set('nuevo-uid',datos);return {uid:'nuevo-uid'};},
    updateUser:async(uid,datos)=>{cuentas.set(uid,{...cuentas.get(uid),...datos});},
    getUser:async uid=>cuentas.get(uid),revokeRefreshTokens:async()=>{},deleteUser:async uid=>cuentas.delete(uid),
  };
  const s={db,auth,FieldValue,Timestamp};
  const req=uid=>({headers:{authorization:`Bearer ${uid}`}});
  const perfil={email:'nuevo@example.com',nombre:'Cuenta',apellido:'Prueba',rol:'admin',lugarTrabajo:'A',contraseña:'no persistir',avisosTraspasos:['notificar_empleado']};
  await assert.rejects(usuarios(req('admin'),{accion:'crear',perfil,password:'contraseña-test'},s),{status:403});
  const res=await usuarios(req('rrhh'),{accion:'crear',perfil,password:'contraseña-test'},s);
  assert.equal(res.uid,'nuevo-uid'); assert.equal(cuentas.get(res.uid).email,perfil.email);
  const guardado=(await db.doc('users/nuevo-uid').get()).data();
  assert.equal(guardado.password,undefined);assert.equal(guardado.contraseña,undefined);assert.deepEqual(guardado.avisosTraspasos,['notificar_empleado']);
  await usuarios(req('rrhh'),{accion:'actualizar',uid:res.uid,perfil:{...perfil,nombre:'Editada'},password:'otra-contraseña'},s);
  assert.equal((await db.doc('users/nuevo-uid').get()).data().nombre,'Editada');
  const listado=await usuarios(req('rrhh'),{accion:'listar'},s);
  assert.ok(listado.usuarios.every(u=>u.password===undefined && u.contraseña===undefined));
  await assert.rejects(usuarios(req('rrhh'),{accion:'desactivar',uid:'rrhh'},s),{status:400});
  await usuarios(req('rrhh'),{accion:'desactivar',uid:res.uid},s);
  assert.equal(cuentas.get(res.uid).disabled,true);assert.equal((await db.doc('users/nuevo-uid').get()).data().activo,false);
});
