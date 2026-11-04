import { servicios } from '../server/firebase-admin.mjs';
import { planificarMigracion } from '../server/migracion-perfiles.mjs';

// Sin --aplicar sólo lee y muestra un resumen; nunca usa contraseñas de Firestore.
const s=servicios();
const cuentas=[];
let siguiente;
do {
  const pagina=await s.auth.listUsers(1000,siguiente);
  cuentas.push(...pagina.users); siguiente=pagina.pageToken;
} while(siguiente);
const docs=await s.db.collection('users').get();
const plan=planificarMigracion(docs.docs.map(d=>({id:d.id,data:d.data()})),cuentas);
console.log(`Perfiles a vincular: ${plan.cambios.length}. Perfiles con otro ID: ${plan.cambios.filter(c=>c.origenes.some(id=>id!==c.uid)).length}.`);
console.log(`Administradores con avisos específicos: ${plan.cambios.filter(c=>c.perfil.rol==='admin' && c.perfil.avisosTraspasos.length).length}.`);
console.table(plan.cambios.map(c=>({uid:c.uid,email:c.perfil.email,rol:c.perfil.rol,area:c.perfil.lugarTrabajo,avisos:c.perfil.avisosTraspasos.join(', ')})));
if (plan.errores.length) { plan.errores.forEach(e=>console.error(e)); console.error('No se aplicó ningún cambio.'); process.exitCode=1; }
else if (!process.argv.includes('--aplicar')) console.log('Simulación completa. Revise los perfiles y ejecute de nuevo con --aplicar.');
else {
  for (const cambio of plan.cambios) {
    const batch=s.db.batch();
    batch.set(s.db.collection('users').doc(cambio.uid),{...cambio.perfil,createdAt:cambio.createdAt || s.FieldValue.serverTimestamp(),updatedAt:s.FieldValue.serverTimestamp()});
    for (const id of new Set([...cambio.origenes,cambio.uid])) {
      const avisos=await s.db.collection('notificaciones').where('usuarioId','==',id).get();
      for(const aviso of avisos.docs) {
        const enlace=cambio.perfil.rol==='admin' && aviso.data().link==='/rrhh/gestion-solicitudes' ? {link:'/admin'} : {};
        if(id!==cambio.uid || Object.keys(enlace).length) await aviso.ref.update({usuarioId:cambio.uid,...enlace});
      }
    }
    for (const id of cambio.origenes) {
      if(id!==cambio.uid) {
        // Copia saneada para trazabilidad; no se archivan contraseñas.
        batch.set(s.db.collection('_migracionesUsers').doc(id),{uid:cambio.uid,perfil:cambio.perfil,fecha:s.FieldValue.serverTimestamp()});
        batch.delete(s.db.collection('users').doc(id));
      }
    }
    await batch.commit();
  }
  console.log('Migración terminada. Se conservaron cuentas, contraseñas de Authentication, áreas y avisos.');
}
