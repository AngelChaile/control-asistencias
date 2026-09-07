// src/utils/notificaciones.js
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';

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