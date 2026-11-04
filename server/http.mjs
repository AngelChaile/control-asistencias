export function errorHttp(status, message) { return Object.assign(new Error(message), { status }); }

export function endpoint(accion) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método no permitido.' }); }
    try {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
      catch { throw errorHttp(400, 'Solicitud inválida.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 16000) throw errorHttp(400, 'Solicitud inválida.');
      const resultado = await accion(req, body);
      return res.status(200).json(resultado);
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error('Error del servicio:', error.code || error.name);
      return res.status(status).json({ error: status < 500 || status === 503 ? error.message : 'No se pudo completar la operación. Intente nuevamente.' });
    }
  };
}

export async function autorizar(req, servicios, roles) {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) throw errorHttp(401, 'Inicie sesión para continuar.');
  let identidad;
  try { identidad = await servicios.auth.verifyIdToken(bearer, true); }
  catch { throw errorHttp(401, 'La sesión caducó. Inicie sesión nuevamente.'); }
  const perfil = await servicios.db.collection('users').doc(identidad.uid).get();
  if (!perfil.exists || perfil.data().activo === false || !roles.includes(perfil.data().rol)) throw errorHttp(403, 'No tiene permiso para esta operación.');
  return { ...perfil.data(), uid: identidad.uid, email: identidad.email };
}
