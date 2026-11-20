import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { cert } from 'firebase-admin/app';
import { createHash } from 'node:crypto';
import { servicios } from '../server/firebase-admin.mjs';
import { perfilSeguro } from '../server/usuarios.mjs';
import { ID_SALUD, secretariaDeArea } from '../src/utils/alcanceAdmin.mjs';
import { normalizarDescripcion } from '../src/utils/regimenVacaciones.mjs';
import { resolverRegimenVacacional } from '../src/utils/vacacionesCalculo.mjs';
import { leerPadron, cambioEmpleado } from './padron-salud.mjs';

// Nomenclatura ratificada por RRHH al conciliar el Excel con el organigrama.
const destinosConfirmados = new Map([
  ['1.9.2.', 'SUBSECRETARIA GENERAL EN SALUD'],
  ['1.9.2.2.', 'DIRECCION EJECUTIVA DEL HOSPITAL DE MORON'],
  ['1.9.2.2.12.', 'COORDINACION RECUPERO DE COSTOS'],
  ['1.9.2.3.', 'DIRECCION ASOCIADA DEL HOSPITAL DE MORON'],
  ['1.9.2.5.', 'DIRECCION DEL SAME'],
  ['1.9.2.7.', 'DIRECCION DE EPIDEMIOLOGIA'],
]);

const [archivo, ...args] = process.argv.slice(2);
const argumento = nombre => args.find(a=>a.startsWith(nombre+'='))?.slice(nombre.length+1);
const aplicar = args.includes('--aplicar');

async function cuentaAdministrativa({auth,db}, perfil, aplicarCambios) {
  // UID estable para reanudar un alta interrumpida sin apropiarse de otra identidad.
  const uid = 'salud-' + createHash('sha256').update(perfil.email).digest('hex').slice(0,28);
  const ref = db.collection('users').doc(uid);
  const [cuenta, documento, porCorreo] = await Promise.all([
    auth.getUserByEmail(perfil.email).catch(e=>{ if(e.code !== 'auth/user-not-found') throw e; return null; }),
    ref.get(), db.collection('users').where('email','==',perfil.email).get(),
  ]);
  if ((cuenta && cuenta.uid !== uid) || porCorreo.docs.some(d=>d.id !== uid)) throw new Error('Ya existe otra cuenta o perfil con ese correo. RRHH debe verificar su titularidad.');
  if (documento.exists) {
    const actual = documento.data();
    if (!cuenta || !isDeepStrictEqual(perfilSeguro(actual),perfil) || (cuenta.disabled && !actual.altaSaludPendiente)) throw new Error('La cuenta existente tiene otro estado o alcance. Revisar en Usuarios.');
    if (!actual.altaSaludPendiente) return async () => 'ya existente';
  } else if (cuenta && !cuenta.disabled) throw new Error('Hay una cuenta activa sin perfil. Revisar en Usuarios.');
  if (aplicarCambios && !cuenta && !process.env.SALUD_ADMIN_PASSWORD) throw new Error('Falta la contraseña inicial en SALUD_ADMIN_PASSWORD.');
  return async () => {
    if (!cuenta) await auth.createUser({uid, email:perfil.email, displayName:`${perfil.nombre} ${perfil.apellido}`, password:process.env.SALUD_ADMIN_PASSWORD, disabled:true});
    if (!documento.exists) await ref.create({...perfil,altaSaludPendiente:true});
    await auth.updateUser(uid,{disabled:false});
    await ref.update({altaSaludPendiente:false});
    return 'habilitada';
  };
}

async function comprobarReglas(proyecto, credencial) {
  const {access_token} = await cert(JSON.parse(credencial)).getAccessToken();
  const leer = async ruta => {
    const res = await fetch('https://firebaserules.googleapis.com/v1/'+ruta, {headers:{Authorization:'Bearer '+access_token}});
    if (!res.ok) throw new Error('No se pudieron verificar las reglas de producción antes de importar.');
    return res.json();
  };
  const release = await leer('projects/'+proyecto+'/releases/cloud.firestore');
  const reglas = await leer(release.rulesetName);
  const publica = /match\s+\/(?:\{\w+=\*\*\}|(?:empleados|users)\/\{\w+\})\s*\{[^{}]*?allow\s+(?:read|list|write)(?:\s*,\s*\w+)*\s*:\s*if\s+true\s*;/;
  for (const archivo of reglas.source.files) {
    const contenido = archivo.content.replace(/\/\/[^\n]*/g,'');
    if (publica.test(contenido)) throw new Error('La base tiene reglas de acceso público. Protegé el padrón y verificá el QR antes de importar.');
  }
}

async function ejecutar() {
  if (args.some(a => !['--aplicar','--nombres=excel','--nombres=firebase'].includes(a) && !a.startsWith('--proyecto='))) throw new Error('Opción de importación desconocida.');
  if (!archivo) throw new Error('Indicá la ruta del Excel. Consultá docs/importacion-salud.md.');
  const padron = leerPadron(archivo);
  const sinRegimen = new Map();
  for (const {empleado} of padron.empleados) {
    if (empleado.activo && !empleado.requiereRevisionCargo && !resolverRegimenVacacional(empleado).encontrado) sinRegimen.set(empleado.categoria, (sinRegimen.get(empleado.categoria) || 0)+1);
  }
  console.log(JSON.stringify({filas:padron.cantidadFilas,legajosPreparados:padron.empleados.length,areas:padron.areas.size,
    cargosOmitidos:padron.cargosOmitidos, bajas:padron.empleados.filter(x=>!x.empleado.activo).length,pendientes:padron.pendientes,activosSinRegimen:Object.fromEntries(sinRegimen)},null,2));
  const proyecto = argumento('--proyecto');
  if (!proyecto && !aplicar) return;
  if (!proyecto) throw new Error('Indicá --proyecto=ID para aplicar.');
  const emulador = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulador) {
    if (proyecto !== 'demo-asistencias' || !/^127\.0\.0\.1:\d+$/.test(emulador) || !/^127\.0\.0\.1:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '')) throw new Error('Usá ambos emuladores locales para las pruebas.');
    process.env.GCLOUD_PROJECT = proyecto;
  } else {
    const credencial = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.GOOGLE_APPLICATION_CREDENTIALS && readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if (!credencial || JSON.parse(credencial).project_id !== proyecto) throw new Error('Falta la cuenta de servicio del proyecto indicado.');
    if (aplicar) await comprobarReglas(proyecto, credencial);
  }
  const s = servicios();
  const perfil = perfilSeguro({email:process.env.SALUD_ADMIN_EMAIL,nombre:process.env.SALUD_ADMIN_NOMBRE,apellido:process.env.SALUD_ADMIN_APELLIDO,rol:'admin',lugarTrabajo:'Salud',secretaria:'SALUD',secretariaAdministradaId:ID_SALUD});
  return importarPadron(s, padron, perfil, aplicar, argumento('--nombres'));
}

export async function importarPadron(s, padron, perfil, aplicarCambios, fuenteNombres) {
  const alta = await cuentaAdministrativa(s,perfil,aplicarCambios);
  const [coleccion, organigrama] = await Promise.all([s.db.collection('empleados').get(),s.db.collection('areas').get()]);
  const porLegajo = new Map();
  const porDocumento = new Map();
  for (const doc of coleccion.docs) {
    for (const [mapa,campo] of [[porLegajo,'legajo'],[porDocumento,'documento']]) {
      const clave = String(doc.get(campo) || '').trim().replace(/\./g,'');
      if (clave) mapa.set(clave,[...(mapa.get(clave) || []),doc]);
    }
  }
  const acciones = [];
  const areas = new Map();
  const diferencias = [];
  const porId = new Map();
  for (const doc of organigrama.docs) {
    const id = doc.get('id') || doc.id;
    if (porId.has(id) && padron.areas.has(id)) throw new Error('Código de área duplicado en Firebase: '+id);
    porId.set(id,doc);
  }
  function nombreDestino(id) {
    const existente = porId.get(id)?.get('nombre');
    return (padron.areas.has(id) && destinosConfirmados.get(id)) || (fuenteNombres === 'excel' && padron.areas.get(id)) || existente || padron.areas.get(id);
  }
  for (const [id,nombreExcel] of padron.areas) {
    const doc = porId.get(id);
    const nombre = nombreDestino(id);
    const padreId = id.replace(/\d+\.$/, '');
    const padre = nombreDestino(padreId) || padreId;
    const area = {id,nombre,ruta:nombre};
    if (doc) {
      const anterior = doc.get('nombre');
      area.documentoAreaId = doc.id;
      if (normalizarDescripcion(anterior) !== normalizarDescripcion(nombreExcel)) {
        diferencias.push({id,excel:nombreExcel,firebase:anterior,confirmado:destinosConfirmados.get(id) || null});
      }
      if (anterior !== nombre) {
        acciones.push({ref:doc.ref, version:doc.updateTime, datos:{nombre}});
      } else area.ruta = doc.get('ruta') || nombre;
    } else {
      acciones.push({ref:s.db.collection('areas').doc(id), datos:{id,nombre,padre,padreId}});
    }
    areas.set(id,area);
  }
  if (fuenteNombres === 'excel' || diferencias.some(d=>d.confirmado)) {
    // En el organigrama anterior, padre contiene el nombre de la dependencia superior.
    for (const [id,doc] of porId) {
      const padreId = id.replace(/\d+\.$/, '');
      if (!padron.areas.has(padreId) || !porId.has(padreId)) continue;
      const anterior = porId.get(padreId).get('nombre');
      const nombrePadre = nombreDestino(padreId);
      if (doc.get('padre') === anterior && anterior !== nombrePadre) {
        const accion = acciones.find(item => item.ref.path === doc.ref.path);
        if (accion) accion.datos.padre = nombrePadre;
        else acciones.push({ref:doc.ref, version:doc.updateTime, datos:{padre:nombrePadre}});
      }
    }
  }
  const conflictos = [];
  const incluidos = new Set();
  for (const { empleado, filas } of padron.empleados) {
    const anteriores = porLegajo.get(empleado.legajo) || [];
    const anterior = anteriores[0];
    if (anteriores.length > 1 || (porDocumento.get(empleado.documento) || []).some(d=>d.id !== anterior?.id)) {
      conflictos.push({filas,motivo:'Legajo o documento duplicado en el sistema.'}); continue;
    }
    try {
      const area = areas.get(empleado.areaId);
      const datos = cambioEmpleado(anterior?.data(), area ? {...empleado,area,lugarTrabajo:area.nombre} : empleado);
      if (anterior) incluidos.add(anterior.id);
      if (Object.keys(datos).length) acciones.push({ref:anterior?.ref || s.db.collection('empleados').doc('salud-'+empleado.legajo), datos, version:anterior?.updateTime});
    } catch(e) { conflictos.push({filas,motivo:e.message}); }
  }
  // Incorporar al alcance a personal ya existente de la misma rama del organigrama.
  for (const doc of coleccion.docs) {
    if (!incluidos.has(doc.id) && secretariaDeArea(doc.get('area') || {id:doc.get('areaId')}) === ID_SALUD && !doc.get('secretariaId')) acciones.push({ref:doc.ref,version:doc.updateTime,datos:{secretariaId:ID_SALUD}});
  }
  // Las fichadas y ausencias conservan la dependencia que tenían al registrarse.
  const nombresSalud = new Set([...areas.values()].map(area => normalizarDescripcion(area.nombre)));
  const etiquetasSalud = ['SALUD','Salud','SECRETARIA DE SALUD','SECRETARÍA DE SALUD','Secretaría de Salud'];
  for (const coleccion of ['asistencias', 'ausencias']) {
    const historicos = await s.db.collection(coleccion).where('secretaria','in',etiquetasSalud).get();
    for (const doc of historicos.docs) {
      const nombre = normalizarDescripcion(doc.get('lugarTrabajo'));
      if (!doc.get('secretariaId') && nombresSalud.has(nombre)) acciones.push({ref:doc.ref,version:doc.updateTime,datos:{secretariaId:ID_SALUD}});
    }
  }
  console.log(JSON.stringify({cambiosPrevistos:acciones.length,diferenciasDeAreas:diferencias,conflictos},null,2));
  if (!aplicarCambios) return;
  if (diferencias.some(d=>!d.confirmado) && !fuenteNombres) throw new Error('Confirmá la fuente de los nombres de área antes de aplicar la carga.');
  if (conflictos.length) throw new Error('Revisá las filas en conflicto antes de escribir en Firebase.');
  for (let i=0; i<acciones.length; i+=300) {
    const lote = s.db.batch();
    for (const {ref,datos,version} of acciones.slice(i,i+300)) {
      if (version) lote.update(ref,datos,{lastUpdateTime:version});
      else lote.create(ref,datos);
    }
    await lote.commit();
  }
  console.log('Cuenta de administración de Salud', await alta());
  console.log('Carga terminada. Legajos procesados:',padron.empleados.length,'Grupos pendientes:',padron.pendientes.length);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) ejecutar().catch(error=>{ console.error(error.message); process.exitCode=1; });
