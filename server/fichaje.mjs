import { createHash } from 'node:crypto';
import { errorHttp } from './http.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export function fechaLocal(now) {
  const parts = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const p = Object.fromEntries(parts.map(item => [item.type, item.value]));
  return { fecha: `${Number(p.day)}/${Number(p.month)}/${p.year}`, hora: `${p.hour}:${p.minute}` };
}
export function comprobarToken(data, now) {
  const vence = data?.expiresAt?.toMillis?.() ?? Date.parse(data?.expiresAt);
  if (!data || data.disabled === true || !Number.isFinite(vence) || vence <= now.getTime()) throw errorHttp(403, 'QR inválido o caducado. Solicite uno nuevo.');
}
export function instanteRegistro(row) {
  if (!row) return null;
  const valor = row.createdAt;
  if (valor?.toDate) return valor.toDate();
  if (valor?.seconds) return new Date(valor.seconds * 1000);
  if (valor instanceof Date) return valor;
  if (typeof valor === 'string' && Number.isFinite(Date.parse(valor))) return new Date(valor);
  const fecha = String(row.fecha || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const hora = String(row.hora || '00:00').match(/^(\d{1,2}):(\d{2})$/);
  if (fecha && hora) return new Date(`${fecha[3]}-${fecha[2].padStart(2,'0')}-${fecha[1].padStart(2,'0')}T${hora[1].padStart(2,'0')}:${hora[2]}:00-03:00`);
  return null;
}
export function ultimoRegistro(rows) {
  return [...rows].sort((a,b) => (instanteRegistro(b)?.getTime() || 0) - (instanteRegistro(a)?.getTime() || 0))[0] || null;
}
export function siguienteTipo(ultimo, now) {
  const fechaAnterior = instanteRegistro(ultimo);
  const mismoDia = fechaAnterior && fechaLocal(fechaAnterior).fecha === fechaLocal(now).fecha;
  return mismoDia && ultimo.tipo === 'ENTRADA' ? 'SALIDA' : 'ENTRADA';
}
function empleadoPublico(emp) {
  return { legajo: emp.legajo, nombre: emp.nombre || '', apellido: emp.apellido || '', lugarTrabajo: emp.lugarTrabajo || '' };
}

// No expone colecciones ni acepta fecha, hora, tipo o datos del empleado del cliente.
export async function fichaje(req, body, { db, FieldValue, Timestamp }, clock = () => new Date()) {
  if (!['validar', 'buscar', 'fichar'].includes(body.accion)) throw errorHttp(400, 'Operación inválida.');
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || token.length > 256) throw errorHttp(403, 'Escanee un QR válido.');
  const legajo = typeof body.legajo === 'string' ? body.legajo.trim() : '';
  if (body.accion !== 'validar' && !/^[0-9]{1,20}$/.test(legajo)) throw errorHttp(400, 'Ingrese un legajo válido.');
  if (body.accion === 'fichar' && !/^[a-zA-Z0-9-]{16,80}$/.test(body.operacionId || '')) throw errorHttp(400, 'Identificador de fichada inválido.');
  const now = clock();
  // Vercel establece x-real-ip; no se confía en una IP enviada en el cuerpo.
  const ip = req.headers['x-real-ip'] || req.socket?.remoteAddress || 'local';
  const ventana = Math.floor(now.getTime() / 300000);
  const limite = db.collection('_fichajeLimites').doc(hash(String(ip)));
  await db.runTransaction(async tx => {
    const snap = await tx.get(limite);
    const cantidad = snap.data()?.ventana === ventana ? snap.data().cantidad : 0;
    if (cantidad >= 1200) throw errorHttp(429, 'Demasiados intentos. Espere unos minutos.');
    tx.set(limite, { cantidad: cantidad + 1, ventana });
  });
  // Conserva los QR ya impresos, cuyos documentos tienen ID automático.
  const tokens = await db.collection('tokens').where('token', '==', token).limit(2).get();
  if (tokens.size !== 1) throw errorHttp(403, 'QR inválido o caducado. Solicite uno nuevo.');
  const tokenDoc = tokens.docs[0];
  comprobarToken(tokenDoc.data(), now);
  if (body.accion === 'validar') return { valido: true };
  const empleados = await db.collection('empleados').where('legajo', '==', legajo).limit(2).get();
  if (empleados.size !== 1) throw errorHttp(404, 'No se pudo identificar el legajo. Consulte al administrador de su área.');
  const empleadoDoc = empleados.docs[0];
  if (empleadoDoc.data().activo === false || empleadoDoc.data().estado === 'inactivo') throw errorHttp(403, 'El agente no está habilitado para fichar. Consulte a RRHH.');
  if (body.accion === 'buscar') return { empleado: empleadoPublico(empleadoDoc.data()) };
  const estadoRef = db.collection('_fichajeEstado').doc(hash(legajo));
  const operacionRef = db.collection('_fichajeOperaciones').doc(hash(`${legajo}:${body.operacionId}`));
  const estadoInicial = await estadoRef.get();
  // Sólo se reconstruye el último evento para agentes aún no migrados al nuevo flujo.
  const historico = estadoInicial.exists ? null : ultimoRegistro((await db.collection('asistencias').where('legajo', '==', legajo).get()).docs.map(d => d.data()));
  const asistenciaRef = db.collection('asistencias').doc();
  return db.runTransaction(async tx => {
    const [estadoSnap, operacionSnap, tokenSnap, empSnap] = await Promise.all([tx.get(estadoRef), tx.get(operacionRef), tx.get(tokenDoc.ref), tx.get(empleadoDoc.ref)]);
    const momento = clock();
    comprobarToken(tokenSnap.data(), momento);
    if (!empSnap.exists || empSnap.data().activo === false || empSnap.data().estado === 'inactivo') throw errorHttp(403, 'El agente no está habilitado para fichar. Consulte a RRHH.');
    if (operacionSnap.exists) return operacionSnap.data().resultado;
    const ultimo = estadoSnap.exists ? estadoSnap.data() : historico;
    if (instanteRegistro(ultimo) && momento.getTime() - instanteRegistro(ultimo).getTime() < 60000) throw errorHttp(409, 'Ya se registró una fichada recientemente. Espere un minuto.');
    const empleado = empSnap.data();
    const { fecha, hora } = fechaLocal(momento);
    const tipo = siguienteTipo(ultimo, momento);
    const resultado = { id: asistenciaRef.id, empleado: empleadoPublico(empleado), fecha, hora, tipo };
    tx.create(asistenciaRef, { ...empleadoPublico(empleado), secretaria: empleado.secretaria || '', tipo, fecha, hora,
      tokenId: tokenDoc.id, createdAt: FieldValue.serverTimestamp(), origen: 'api' });
    tx.set(estadoRef, { tipo, createdAt: Timestamp.fromDate(momento), asistenciaId: asistenciaRef.id });
    tx.create(operacionRef, { resultado, createdAt: FieldValue.serverTimestamp() });
    return resultado;
  });
}
