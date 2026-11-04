import { perfilSeguro } from './usuarios.mjs';
import { AVISOS_ANTERIORES } from '../src/utils/destinatariosTraspasos.mjs';

export function planificarMigracion(perfiles, cuentas) {
  const authPorEmail = new Map(cuentas.filter(c=>c.email).map(c=>[c.email.toLowerCase(),c]));
  const authPorUID = new Map(cuentas.map(c=>[c.uid,c]));
  const grupos = new Map();
  const errores = [];
  for (const doc of perfiles) {
    const email = String(doc.data.email || '').trim().toLowerCase();
    const cuenta = authPorEmail.get(email);
    if (authPorUID.has(doc.id) && authPorUID.get(doc.id).email?.toLowerCase() !== email) {
      errores.push(`Perfil ${doc.id}: su ID pertenece a otra cuenta de Authentication. Revise la identidad antes de migrar.`); continue;
    }
    if (!cuenta) { errores.push(`Perfil ${doc.id}: no tiene cuenta de Authentication con ese correo.`); continue; }
    const lista = grupos.get(cuenta.uid) || [];
    lista.push(doc); grupos.set(cuenta.uid, lista);
  }
  const cambios=[];
  for (const [uid,docs] of grupos) {
    const canonical = docs.find(d=>d.id===uid) || docs[0];
    try {
      const cuenta=cuentas.find(c=>c.uid===uid);
      const limpiar = d => perfilSeguro({...d,activo:d.activo !== false && cuenta.disabled !== true,rol:d.rol==='coordinador_traspasos' ? 'admin' : d.rol,
        avisosTraspasos:d.avisosTraspasos || AVISOS_ANTERIORES[d.email?.toLowerCase()] || []});
      const perfil=limpiar(canonical.data);
      if (docs.some(d=>JSON.stringify(limpiar(d.data))!==JSON.stringify(perfil))) throw new Error('Hay perfiles duplicados con datos distintos. Revise cuál corresponde antes de migrar.');
      cambios.push({uid,perfil,origenes:docs.map(d=>d.id),createdAt:canonical.data.createdAt || null});
    } catch(error) { errores.push(`Perfil ${canonical.id}: ${error.message}`); }
  }
  if (!cambios.some(c=>c.perfil.rol==='rrhh' && c.perfil.activo)) errores.push('No queda ningún perfil activo de RRHH.');
  return {cambios,errores};
}
