import { autorizar, errorHttp } from './http.mjs';

export const RESPONSABILIDADES = ['actualizar_sistemas', 'notificar_empleado'];
export function perfilSeguro(datos) {
  const rol = datos.rol;
  if (!['empleado', 'admin', 'rrhh', 'subsecretario'].includes(rol)) throw errorHttp(400, 'Rol inválido.');
  const perfil = Object.fromEntries(['email','nombre','apellido','legajo','lugarTrabajo','secretaria','areaId'].map(key => [key, String(datos[key] || '').trim()]));
  if (!perfil.nombre || !perfil.apellido || !perfil.email || (rol === 'admin' && !perfil.lugarTrabajo)) throw errorHttp(400, 'Complete nombre, apellido, correo y el área del administrador.');
  if (Object.values(perfil).some(value => value.length > 250)) throw errorHttp(400, 'Hay campos demasiado extensos.');
  perfil.email = perfil.email.toLowerCase();
  return { ...perfil, rol, activo: datos.activo !== false,
    avisosTraspasos: [...new Set((Array.isArray(datos.avisosTraspasos) ? datos.avisosTraspasos : []).filter(r => RESPONSABILIDADES.includes(r)))] };
}

export async function usuarios(req, body, servicios) {
  const solicitante = await autorizar(req, servicios, ['rrhh']);
  const { db, auth, FieldValue } = servicios;
  if (body.accion === 'listar') {
    const docs = await db.collection('users').get();
    return { usuarios: docs.docs.map(doc => {
      const d = doc.data();
      // Lista explícita: nunca se envían antiguas contraseñas ni campos arbitrarios.
      return { id: doc.id, ...Object.fromEntries(['email','nombre','apellido','legajo','lugarTrabajo','secretaria','areaId','rol','activo','avisosTraspasos'].map(key => [key, key === 'avisosTraspasos' ? (Array.isArray(d[key]) ? d[key] : []) : d[key] ?? (key === 'activo' ? true : '')])) };
    }) };
  }
  if (!['crear','actualizar','desactivar'].includes(body.accion)) throw errorHttp(400, 'Operación inválida.');
  if (body.accion !== 'crear' && (typeof body.uid !== 'string' || !body.uid || body.uid.includes('/'))) throw errorHttp(400, 'UID inválido.');
  if (body.accion === 'desactivar') {
    if (body.uid === solicitante.uid) throw errorHttp(400, 'No puede desactivar su propia cuenta.');
    await auth.updateUser(body.uid, { disabled: true });
    await auth.revokeRefreshTokens(body.uid);
    await db.collection('users').doc(body.uid).update({ activo: false, updatedAt: FieldValue.serverTimestamp() });
    return { ok: true };
  }
  const perfil = perfilSeguro(body.perfil || {});
  const password = body.password;
  if (password && (typeof password !== 'string' || password.length < 8 || password.length > 128)) throw errorHttp(400, 'Use una contraseña de entre 8 y 128 caracteres.');
  if (body.accion === 'crear') {
    if (!password) throw errorHttp(400, 'Ingrese la contraseña inicial.');
    let cuenta;
    try { cuenta = await auth.createUser({ email: perfil.email, password, displayName: `${perfil.nombre} ${perfil.apellido}`, disabled: !perfil.activo }); }
    catch (error) { if (error.code === 'auth/email-already-exists') throw errorHttp(409, 'El correo ya tiene cuenta. Vincule el perfil existente mediante la migración por UID.'); throw error; }
    try { await db.collection('users').doc(cuenta.uid).create({ ...perfil, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }); }
    catch (error) { await auth.deleteUser(cuenta.uid); throw error; }
    return { uid: cuenta.uid };
  }
  if (body.uid === solicitante.uid && (perfil.rol !== 'rrhh' || !perfil.activo)) throw errorHttp(400, 'No puede quitarse su propio acceso de RRHH.');
  const ref = db.collection('users').doc(body.uid);
  const original = await ref.get();
  if (!original.exists) throw errorHttp(404, 'El perfil ya no existe.');
  const cuenta = await auth.getUser(body.uid);
  await auth.updateUser(body.uid, { email: perfil.email, disabled: !perfil.activo, displayName: `${perfil.nombre} ${perfil.apellido}` });
  try {
    // Reemplazo deliberado para eliminar contraseñas antiguas almacenadas en Firestore.
    await ref.set({ ...perfil, createdAt: original.data().createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  } catch (error) {
    await auth.updateUser(body.uid, { email: cuenta.email, disabled: cuenta.disabled, displayName: cuenta.displayName || '' });
    throw error;
  }
  if (password) await auth.updateUser(body.uid, { password });
  if (password || !perfil.activo || perfil.rol !== original.data().rol) await auth.revokeRefreshTokens(body.uid);
  return { uid: body.uid };
}
