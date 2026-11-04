import test from 'node:test';
import assert from 'node:assert/strict';
import { comprobarToken, fechaLocal, siguienteTipo, ultimoRegistro } from '../server/fichaje.mjs';
import { perfilSeguro } from '../server/usuarios.mjs';
import { planificarMigracion } from '../server/migracion-perfiles.mjs';
import { destinatariosTraspaso } from '../src/utils/destinatariosTraspasos.mjs';
import { endpoint, autorizar } from '../server/http.mjs';

const perfil={email:'alguien@example.com',nombre:'Agente',apellido:'Prueba',rol:'admin',lugarTrabajo:'Edilicio'};
test('los perfiles admiten sólo roles vigentes y nunca guardan contraseña, UID o privilegios arbitrarios',()=>{
  const limpio=perfilSeguro({...perfil,password:'secreto',contraseña:'otro',uid:'suplantado',admin:true,avisosTraspasos:['actualizar_sistemas','intruso']});
  assert.equal(limpio.password,undefined); assert.equal(limpio.contraseña,undefined); assert.equal(limpio.uid,undefined); assert.equal(limpio.admin,undefined);
  assert.deepEqual(limpio.avisosTraspasos,['actualizar_sistemas']);
  assert.throws(()=>perfilSeguro({...perfil,rol:'coordinador_traspasos'}));
  assert.throws(()=>perfilSeguro({...perfil,lugarTrabajo:''}));
});
test('migración por correo de Authentication conserva área, cambia coordinador a admin y asigna responsabilidad',()=>{
  const plan=planificarMigracion([
    {id:'viejo',data:{...perfil,email:'safeguarding740@gmail.com',rol:'coordinador_traspasos',contraseña:'nunca copiar'}},
    {id:'rrhh',data:{...perfil,email:'rrhh@example.com',rol:'rrhh'}},
  ],[{uid:'nuevo',email:'safeguarding740@gmail.com'},{uid:'rrhh',email:'rrhh@example.com'}]);
  assert.deepEqual(plan.errores,[]); assert.equal(plan.cambios[0].uid,'nuevo'); assert.equal(plan.cambios[0].perfil.rol,'admin');
  assert.equal(plan.cambios[0].perfil.lugarTrabajo,'Edilicio'); assert.deepEqual(plan.cambios[0].perfil.avisosTraspasos,['notificar_empleado']);
  assert.equal(plan.cambios[0].perfil.contraseña,undefined);
});
test('migración se detiene ante cuenta inexistente, duplicados distintos o pérdida de RRHH',()=>{
  const plan=planificarMigracion([{id:'a',data:perfil},{id:'b',data:{...perfil,rol:'rrhh'}}],[{uid:'uid',email:perfil.email}]);
  assert.ok(plan.errores.some(e=>e.includes('duplicados')));
  assert.ok(plan.errores.some(e=>e.includes('RRHH')));
  assert.ok(planificarMigracion([{id:'a',data:perfil}],[]).errores.some(e=>e.includes('Authentication')));
});
test('avisos específicos llegan a administradores fuera de las áreas afectadas y no se pisan con el aviso de área',()=>{
  const avisos=destinatariosTraspaso([
    {uid:'coord',...perfil,avisosTraspasos:['actualizar_sistemas','notificar_empleado']},
    {uid:'otra',...perfil,email:'otra@example.com',lugarTrabajo:'Destino'},
    {uid:'inactivo',...perfil,email:'inactivo@example.com',activo:false,avisosTraspasos:['actualizar_sistemas']},
  ],{empleado:{nombre:'Prueba',legajo:'123'},areaOrigen:'Edilicio',areaDestino:'Destino'});
  assert.equal(avisos.length,2); assert.match(avisos[0].mensaje,/Major/); assert.match(avisos[0].mensaje,/notificar/); assert.match(avisos[0].mensaje,/ya no pertenece/); assert.equal(avisos[0].link,'/admin');
  assert.match(avisos[1].mensaje,/asignado/);
});
test('migración no pisa un UID ocupado por el perfil de otra identidad',()=>{
  const plan=planificarMigracion([{id:'uid-a',data:perfil}],[{uid:'uid-a',email:'otra@example.com'},{uid:'uid-b',email:perfil.email}]);
  assert.ok(plan.errores.some(e=>e.includes('otra cuenta')));assert.equal(plan.cambios.length,0);
});
test('QR debe existir, estar habilitado y tener fecha de vencimiento válida en el servidor',()=>{
  const now=new Date('2026-11-04T12:00:00Z');
  for(const data of [null,{}, {expiresAt:'invalida'}, {expiresAt:'2026-11-03'}, {disabled:true,expiresAt:'2027-01-01'}]) assert.throws(()=>comprobarToken(data,now));
  assert.doesNotThrow(()=>comprobarToken({expiresAt:'2027-01-01T00:00:00Z'},now));
});
test('entrada y salida se calculan con fecha de Buenos Aires, independiente del huso del servidor',()=>{
  const now=new Date('2026-11-05T02:30:00Z');
  assert.deepEqual(fechaLocal(now),{fecha:'4/11/2026',hora:'23:30'});
  const entrada={tipo:'ENTRADA',createdAt:{toDate:()=>new Date('2026-11-04T12:00:00Z')}};
  assert.equal(siguienteTipo(entrada,now),'SALIDA');
  assert.equal(siguienteTipo(entrada,new Date('2026-11-05T12:00:00Z')),'ENTRADA');
});
test('API verifica ID token revocado y rol del perfil UID; nunca usa roles del cuerpo',async()=>{
  let checkRevoked;
  const s={auth:{verifyIdToken:async(token,revoked)=>{checkRevoked=revoked;return {uid:'uid',email:'correo@example.com'};}},db:{collection:()=>({doc:()=>({get:async()=>({exists:true,data:()=>({...perfil,rol:'admin'})})})})}};
  await assert.rejects(autorizar({headers:{}},s,['rrhh']),{status:401});
  await assert.rejects(autorizar({headers:{authorization:'Bearer token'}},s,['rrhh']),{status:403});
  assert.equal(checkRevoked,true);
});
test('la transición recupera la última fichada de históricos con Timestamp, ISO o fecha y hora',()=>{
  const ultimo=ultimoRegistro([{tipo:'SALIDA',createdAt:'2026-11-04T11:00:00Z'},{tipo:'ENTRADA',fecha:'4/11/2026',hora:'09:00'}]);
  assert.equal(ultimo.tipo,'ENTRADA');assert.equal(siguienteTipo(ultimo,new Date('2026-11-04T18:00:00Z')),'SALIDA');
});
test('API rechaza métodos y JSON inválidos, no expone errores internos ni permite caché',async()=>{
  const ejecutar=async(req,accion)=>{
    const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
    await endpoint(accion)(req,res); return res;
  };
  assert.equal((await ejecutar({method:'GET'},()=>{})).code,405);
  assert.equal((await ejecutar({method:'POST',body:'{'},()=>{})).code,400);
  const res=await ejecutar({method:'POST',body:{}},()=>{throw new Error('clave privada');});
  assert.equal(res.code,500); assert.doesNotMatch(res.body.error,/clave/); assert.equal(res.headers['Cache-Control'],'no-store');
});
