// src/utils/traspasos.js
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

// 📝 Crear una nueva solicitud de traspaso
export async function crearSolicitudTraspaso(solicitudData) {
  try {
    const docRef = await addDoc(collection(db, 'solicitudes_traspaso'), {
      ...solicitudData,
      estado: 'pendiente',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...solicitudData };
  } catch (error) {
    console.error('Error creando solicitud:', error);
    throw error;
  }
}

// 📋 Obtener todas las solicitudes
export async function getSolicitudes() {
  try {
    const q = query(
      collection(db, 'solicitudes_traspaso'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    throw error;
  }
}

// 📋 Obtener solicitudes por estado
export async function getSolicitudesByEstado(estado) {
  try {
    const q = query(
      collection(db, 'solicitudes_traspaso'),
      where('estado', '==', estado),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    throw error;
  }
}

// 📋 Obtener solicitudes por empleado
export async function getSolicitudesByEmpleado(legajo) {
  try {
    const q = query(
      collection(db, 'solicitudes_traspaso'),
      where('empleado.legajo', '==', legajo),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    throw error;
  }
}

// ✅ Aprobar solicitud (RRHH)
export async function aprobarSolicitudRRHH(solicitudId, observaciones = '') {
  try {
    const docRef = doc(db, 'solicitudes_traspaso', solicitudId);
    await updateDoc(docRef, {
      'aprobaciones.rrhh.estado': 'aprobado',
      'aprobaciones.rrhh.fecha': serverTimestamp(),
      'aprobaciones.rrhh.observaciones': observaciones,
      estado: 'rrhh_aprobado',
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error aprobando solicitud:', error);
    throw error;
  }
}

// ✅ Aprobar solicitud (Subsecretaría)
export async function aprobarSolicitudSubsecretaria(solicitudId, observaciones = '') {
  try {
    const docRef = doc(db, 'solicitudes_traspaso', solicitudId);
    await updateDoc(docRef, {
      'aprobaciones.subsecretaria.estado': 'aprobado',
      'aprobaciones.subsecretaria.fecha': serverTimestamp(),
      'aprobaciones.subsecretaria.observaciones': observaciones,
      estado: 'subsecretaria_aprobado',
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error aprobando solicitud:', error);
    throw error;
  }
}

// ❌ Rechazar solicitud
export async function rechazarSolicitud(solicitudId, motivo) {
  try {
    const docRef = doc(db, 'solicitudes_traspaso', solicitudId);
    await updateDoc(docRef, {
      estado: 'rechazado',
      motivoRechazo: motivo,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error rechazando solicitud:', error);
    throw error;
  }
}

// 🔄 Ejecutar traspaso (finalizar)
export async function ejecutarTraspaso(solicitudId) {
  try {
    const solicitudRef = doc(db, 'solicitudes_traspaso', solicitudId);
    const solicitudDoc = await getDoc(solicitudRef);
    const solicitud = solicitudDoc.data();
    
    // 1. Actualizar el empleado con la nueva área
    const empleadoQuery = query(
      collection(db, 'empleados'),
      where('legajo', '==', solicitud.empleado.legajo)
    );
    const empleadoSnapshot = await getDocs(empleadoQuery);
    
    if (!empleadoSnapshot.empty) {
      const empleadoDoc = empleadoSnapshot.docs[0];
      const empleadoRef = doc(db, 'empleados', empleadoDoc.id);
      
      await updateDoc(empleadoRef, {
        area: solicitud.areaDestino,
        lugarTrabajo: solicitud.areaDestino.nombre,
        updatedAt: serverTimestamp()
      });
    }
    
    // 2. Actualizar la solicitud
    await updateDoc(solicitudRef, {
      estado: 'finalizado',
      fechaEjecucion: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error ejecutando traspaso:', error);
    throw error;
  }
}