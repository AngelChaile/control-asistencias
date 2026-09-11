// src/utils/notificaciones.js
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const COORDINADORES_TRASPASOS = [
  {
    email: 'chaile.angel@moron.gob.ar',
    mensaje: 'Debe actualizar el traspaso del personal en Major y Portal Empleados.'
  },
  {
    email: 'registrosdeasistenciasmoron@gmail.com',
    mensaje: 'Debe notificar al empleado su baja del área anterior y su nuevo destino.'
  }
];

// 🔔 Crear una notificación
export async function crearNotificacion({ usuarioId, titulo, mensaje, tipo, link }) {
  try {
    await addDoc(collection(db, 'notificaciones'), {
      usuarioId,
      titulo,
      mensaje,
      tipo, // 'solicitud', 'aprobacion', 'rechazo', 'info'
      link,
      leido: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creando notificación:', error);
  }
}

// 📬 Obtener notificaciones de un usuario
export async function getNotificaciones(usuarioId) {
  try {
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', usuarioId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
}

// ✅ Marcar notificación como leída
export async function marcarComoLeida(notificacionId) {
  try {
    const ref = doc(db, 'notificaciones', notificacionId);
    await updateDoc(ref, { leido: true });
  } catch (error) {
    console.error('Error marcando notificación:', error);
  }
}

// Crea avisos dentro del sistema y una cola para una futura función segura de correo.
export async function notificarTraspasoFinalizado({ empleado, areaOrigen, areaDestino, tipo = 'traspaso' }) {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const usuarios = snapshot.docs.map(item => ({ uid: item.id, ...item.data() }));
    const nombreEmpleado = empleado?.nombre || 'El empleado';
    const textoBase = `${nombreEmpleado} fue traspasado de ${areaOrigen} a ${areaDestino}.`;
    const destinatarios = new Map();

    COORDINADORES_TRASPASOS.forEach(coordinador => {
      const usuario = usuarios.find(item => item.email?.toLowerCase() === coordinador.email);
      destinatarios.set(coordinador.email, { usuarioId: usuario?.uid || null, titulo: 'Traspaso finalizado', mensaje: `${textoBase} ${coordinador.mensaje}`, tipo: 'traspaso_coordinacion' });
    });

    usuarios.filter(usuario => ['admin', 'coordinador_traspasos'].includes(usuario.rol) &&
      [areaOrigen, areaDestino].includes(usuario.lugarTrabajo)).forEach(usuario => {
      const esDestino = usuario.lugarTrabajo === areaDestino;
      destinatarios.set(usuario.email, {
        usuarioId: usuario.uid,
        titulo: esDestino ? 'Nuevo empleado asignado' : 'Empleado desvinculado del área',
        mensaje: esDestino ? `${nombreEmpleado} fue asignado a su área (${areaDestino}).` : `${nombreEmpleado} ya no pertenece a su área y fue destinado a ${areaDestino}.`,
        tipo: 'traspaso_area'
      });
    });

    await Promise.all([...destinatarios.entries()].map(async ([email, aviso]) => {
      if (aviso.usuarioId) await crearNotificacion({ ...aviso, link: '/rrhh/gestion-solicitudes' });
      await addDoc(collection(db, 'notificaciones_email'), {
        destinatarioEmail: email, asunto: aviso.titulo, mensaje: aviso.mensaje,
        tipo, estado: 'pendiente', createdAt: serverTimestamp()
      });
    }));
  } catch (error) {
    console.error('Error creando notificaciones de traspaso:', error);
  }
}
