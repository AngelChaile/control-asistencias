// src/utils/traspasos.js
import { db } from '../firebase';
import { notificarTraspasoFinalizado } from './notificaciones';
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

const fechaActual = () => new Date().toISOString().split('T')[0];

function actualizarHistorialAreas(empleado, destino) {
  const hoy = fechaActual();
  const origen = empleado.area?.nombre || empleado.lugarTrabajo || 'Sin área';
  const historial = empleado.historialAreas || [];
  const ultimoActivo = historial.findIndex(item => !item.fechaFin);
  const cerrado = ultimoActivo >= 0
    ? historial.map((item, index) => index === ultimoActivo ? { ...item, fechaFin: hoy } : item)
    : [...historial, { area: origen, fechaInicio: empleado.fechaIngreso || hoy, fechaFin: hoy }];
  return [...cerrado, { area: destino.nombre, fechaInicio: hoy, fechaFin: null }];
}

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
// src/utils/traspasos.js - Función ejecutarTraspaso (MODIFICADA)

export async function ejecutarTraspaso(solicitudId) {
  try {
    const solicitudRef = doc(db, 'solicitudes_traspaso', solicitudId);
    const solicitudDoc = await getDoc(solicitudRef);
    const solicitud = solicitudDoc.data();
    
    // 1. Obtener el empleado
    const empleadoQuery = query(
      collection(db, 'empleados'),
      where('legajo', '==', solicitud.empleado.legajo)
    );
    const empleadoSnapshot = await getDocs(empleadoQuery);
    
    if (!empleadoSnapshot.empty) {
      const empleadoDoc = empleadoSnapshot.docs[0];
      const empleadoRef = doc(db, 'empleados', empleadoDoc.id);
      const empleadoData = empleadoDoc.data();
      
      // ✅ NUEVO: Crear entrada en el historial de traspasos
      const historialEntry = {
        fecha: fechaActual(),
        areaOrigen: solicitud.empleado.areaOrigen?.nombre || empleadoData.lugarTrabajo || 'Sin área',
        areaDestino: solicitud.areaDestino.nombre,
        motivo: solicitud.motivo,
        solicitudId: solicitudId,
        aprobadoPor: 'Subsecretaría'
      };
      
      // ✅ Actualizar el historial del empleado
      const historialActual = empleadoData.historialTraspasos || [];
      await updateDoc(empleadoRef, {
        area: solicitud.areaDestino,
        lugarTrabajo: solicitud.areaDestino.nombre,
        historialTraspasos: [...historialActual, historialEntry],
        historialAreas: actualizarHistorialAreas(empleadoData, solicitud.areaDestino),
        updatedAt: serverTimestamp()
      });
      await notificarTraspasoFinalizado({
        empleado: solicitud.empleado,
        areaOrigen: historialEntry.areaOrigen,
        areaDestino: solicitud.areaDestino.nombre,
        tipo: solicitud.tipoSolicitud || 'traspaso'
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

// Asigna un empleado disponible a un pedido de personal ya aprobado.
export async function asignarEmpleadoAPedido(solicitudId, empleado) {
  try {
    const solicitudRef = doc(db, 'solicitudes_traspaso', solicitudId);
    const solicitudDoc = await getDoc(solicitudRef);
    if (!solicitudDoc.exists()) throw new Error('La solicitud ya no existe.');
    const solicitud = solicitudDoc.data();
    if (solicitud.tipoSolicitud !== 'solicitud_personal' || solicitud.estado !== 'asignacion_pendiente') {
      throw new Error('Este pedido no está disponible para asignación.');
    }

    const necesidadIndex = (solicitud.necesidades || []).findIndex(item =>
      item.funcion === empleado.funcion && Number(item.cantidadAsignada || 0) < Number(item.cantidad || 0)
    );
    if (necesidadIndex < 0) throw new Error('La función del empleado no coincide con un cupo pendiente del pedido.');

    const empleadoQuery = query(collection(db, 'empleados'), where('legajo', '==', empleado.legajo));
    const empleadoSnapshot = await getDocs(empleadoQuery);
    if (empleadoSnapshot.empty) throw new Error('No se encontró el empleado seleccionado.');

    const empleadoDoc = empleadoSnapshot.docs[0];
    const empleadoData = empleadoDoc.data();
    const historial = empleadoData.historialTraspasos || [];
    const origen = empleadoData.area?.nombre || empleadoData.lugarTrabajo || 'A Disposición de Personal';
    const destino = solicitud.areaDestino;
    const necesidadesActualizadas = solicitud.necesidades.map((item, index) => index === necesidadIndex
      ? { ...item, cantidadAsignada: Number(item.cantidadAsignada || 0) + 1 }
      : item);
    const asignaciones = solicitud.asignaciones || [];
    const completa = necesidadesActualizadas.every(item => Number(item.cantidadAsignada || 0) >= Number(item.cantidad || 0));

    await updateDoc(doc(db, 'empleados', empleadoDoc.id), {
      area: destino,
      lugarTrabajo: destino.nombre,
      historialTraspasos: [...historial, {
        fecha: fechaActual(), areaOrigen: origen, areaDestino: destino.nombre,
        motivo: `Asignación a pedido de personal`, solicitudId, aprobadoPor: 'RRHH / Subsecretaría'
      }],
      historialAreas: actualizarHistorialAreas(empleadoData, destino),
      updatedAt: serverTimestamp()
    });
    await updateDoc(solicitudRef, {
      necesidades: necesidadesActualizadas,
      asignaciones: [...asignaciones, { legajo: empleado.legajo, nombre: `${empleado.nombre} ${empleado.apellido}`, funcion: empleado.funcion || '', fecha: serverTimestamp() }],
      estado: completa ? 'finalizado' : 'asignacion_pendiente',
      updatedAt: serverTimestamp()
    });
    await notificarTraspasoFinalizado({
      empleado,
      areaOrigen: origen,
      areaDestino: destino.nombre,
      tipo: 'asignacion_pedido'
    });
    return { completa };
  } catch (error) {
    console.error('Error asignando empleado al pedido:', error);
    throw error;
  }
}

// Destina directamente un empleado disponible. Sólo debe invocarlo Subsecretaría.
export async function destinarEmpleadoDisponible(empleado, areaDestino, ejecutadoPor = 'Subsecretaría') {
  const empleadoQuery = query(collection(db, 'empleados'), where('legajo', '==', empleado.legajo));
  const snapshot = await getDocs(empleadoQuery);
  if (snapshot.empty) throw new Error('No se encontró el empleado seleccionado.');
  const empleadoDoc = snapshot.docs[0];
  const datos = empleadoDoc.data();
  const origen = datos.area?.nombre || datos.lugarTrabajo || 'A Disposición de Personal';
  await updateDoc(doc(db, 'empleados', empleadoDoc.id), {
    area: areaDestino,
    lugarTrabajo: areaDestino.nombre,
    historialTraspasos: [...(datos.historialTraspasos || []), {
      fecha: fechaActual(), areaOrigen: origen, areaDestino: areaDestino.nombre,
      motivo: 'Destino asignado desde Disponibles', aprobadoPor: ejecutadoPor
    }],
    historialAreas: actualizarHistorialAreas(datos, areaDestino),
    updatedAt: serverTimestamp()
  });
  await notificarTraspasoFinalizado({ empleado, areaOrigen: origen, areaDestino: areaDestino.nombre, tipo: 'destino_disponibles' });
  return {
    empleado: { legajo: empleado.legajo, nombre: `${empleado.nombre} ${empleado.apellido}`, funcion: empleado.funcion || '', areaOrigen: { nombre: origen } },
    areaDestino, motivo: 'Destino asignado desde Disponibles', observaciones: '', fechaEjecucion: new Date().toISOString()
  };
}

// RRHH propone un destino desde Disponibles; queda listo para Subsecretaría.
export async function solicitarDestinoDesdeDisponibles(empleado, areaDestino, creadoPor, creadorNombre) {
  const origen = empleado.area || { id: empleado.lugarTrabajo || 'disposicion-personal', nombre: empleado.lugarTrabajo || 'A Disposición de Personal' };
  const docRef = await addDoc(collection(db, 'solicitudes_traspaso'), {
    tipoSolicitud: 'traspaso_individual', origenSolicitud: 'disponibles',
    empleado: { legajo: empleado.legajo, nombre: `${empleado.nombre} ${empleado.apellido}`, funcion: empleado.funcion || '', areaOrigen: origen },
    areaDestino, motivo: 'Destino propuesto desde el módulo de Disponibles', observaciones: '', creadoPor, creadorNombre,
    estado: 'rrhh_aprobado',
    aprobaciones: {
      rrhh: { estado: 'aprobado', fecha: serverTimestamp(), observaciones: 'Destino propuesto desde Disponibles' },
      subsecretaria: { estado: 'pendiente', fecha: null, observaciones: null }
    },
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  return docRef.id;
}
