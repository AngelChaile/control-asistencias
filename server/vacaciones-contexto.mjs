import { autorizar, errorHttp } from './http.mjs';

export async function vacacionesContexto(req, body, s) {
  const usuario = await autorizar(req, s, ['admin','rrhh','subsecretario']);
  if (body.accion === 'numero') {
    const anio = Number(body.anio);
    if (!Number.isInteger(anio) || anio < 2020 || anio > 2099) throw errorHttp(400, 'Período inválido.');
    const ref = s.db.collection('_contadores').doc(`vacaciones_${anio}`);
    const numero = await s.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const actual = snap.exists ? snap.data().valor : (await tx.get(s.db.collection('solicitudesVacaciones').where('anioVacacional', '==', anio))).size;
      tx.set(ref, { valor: actual + 1 });
      return actual + 1;
    });
    return { numero: `VAC-${anio}-${String(numero).padStart(5,'0')}` };
  }
  if (body.accion !== 'historial' || !/^[0-9]{1,20}$/.test(body.legajo || '')) throw errorHttp(400, 'Legajo inválido.');
  if (usuario.rol === 'admin') {
    const empleados = await s.db.collection('empleados').where('legajo','==',body.legajo).limit(2).get();
    if (empleados.size !== 1 || !usuario.lugarTrabajo || empleados.docs[0].data().lugarTrabajo !== usuario.lugarTrabajo) throw errorHttp(403, 'El agente no pertenece a su área.');
  }
  const docs = await s.db.collection('solicitudesVacaciones').where('legajo','==',body.legajo).get();
  return { solicitudes: docs.docs.map(d => ({ ...d.data(), id:d.id,
    fechaAprobacion: d.data().fechaAprobacion ? { seconds: d.data().fechaAprobacion.seconds } : null })) };
}
