// src/pages/RRHH/GestionSolicitudes.jsx - CORREGIDO

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, query, where, orderBy, updateDoc, doc } from '../../firebase';
import { aprobarSolicitudRRHH, rechazarSolicitud } from '../../utils/traspasos';
import Swal from 'sweetalert2';

export default function GestionSolicitudes() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendiente');
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarSolicitudes();
  }, [filtro]);

  const cargarSolicitudes = async () => {
    setLoading(true);
    setError(null);
    try {
      let q;
      if (filtro === 'todas') {
        // Sin orderBy para evitar problemas de índice
        q = collection(db, 'solicitudes_traspaso');
      } else {
        q = query(
          collection(db, 'solicitudes_traspaso'),
          where('estado', '==', filtro)
        );
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar manualmente por fecha (más reciente primero)
      data.sort((a, b) => {
        const fechaA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const fechaB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return fechaB - fechaA;
      });
      
      setSolicitudes(data);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      setError(error.message);
      
      // Si es error de índice, mostrar enlace
      if (error.message.includes('index')) {
        const link = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        if (link) {
          Swal.fire({
            icon: 'warning',
            title: 'Índice requerido',
            html: `Necesitas crear un índice en Firestore. <br><a href="${link[0]}" target="_blank" class="text-blue-600 underline">Haz clic aquí para crearlo</a>`,
            confirmButtonText: 'Entendido'
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (solicitudId) => {
    const result = await Swal.fire({
      title: '✅ ¿Aprobar esta solicitud?',
      text: 'El empleado será traspasado al área destino',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await aprobarSolicitudRRHH(solicitudId);
        Swal.fire('✅ Aprobado', 'La solicitud ha sido aprobada por RRHH', 'success');
        cargarSolicitudes();
      } catch (error) {
        Swal.fire('❌ Error', 'No se pudo aprobar la solicitud', 'error');
      }
    }
  };

  const handleRechazar = async (solicitudId) => {
    const { value: motivo } = await Swal.fire({
      title: 'Motivo del rechazo',
      input: 'textarea',
      inputLabel: '¿Por qué rechazas esta solicitud?',
      inputPlaceholder: 'Escribe el motivo...',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar'
    });

    if (motivo) {
      try {
        await rechazarSolicitud(solicitudId, motivo);
        Swal.fire('✅ Rechazado', 'La solicitud ha sido rechazada', 'warning');
        cargarSolicitudes();
      } catch (error) {
        Swal.fire('❌ Error', 'No se pudo rechazar la solicitud', 'error');
      }
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'rrhh_aprobado': 'bg-blue-100 text-blue-800',
      'subsecretaria_aprobado': 'bg-green-100 text-green-800',
      'rechazado': 'bg-red-100 text-red-800',
      'finalizado': 'bg-gray-100 text-gray-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      'pendiente': '🟡 Pendiente',
      'rrhh_aprobado': '🔵 Aprobado por RRHH',
      'subsecretaria_aprobado': '🟢 Aprobado por Subsecretaría',
      'rechazado': '🔴 Rechazado',
      'finalizado': '⚪ Finalizado'
    };
    return textos[estado] || estado;
  };

  return (
    <div className="app-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 Gestión de Solicitudes de Traspaso</h1>
        <p className="text-gray-600">Administra las solicitudes de traspaso de personal</p>
      </div>

      {/* Filtros */}
      <div className="card p-6 mb-6">
        <div className="flex flex-wrap gap-2">
          {['pendiente', 'rrhh_aprobado', 'subsecretaria_aprobado', 'rechazado', 'finalizado', 'todas'].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltro(estado)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === estado
                  ? 'bg-municipio-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {estado === 'todas' ? '📋 Todas' : estado.charAt(0).toUpperCase() + estado.slice(1)}
            </button>
          ))}
        </div>
        <button 
          onClick={cargarSolicitudes} 
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          🔄 Recargar
        </button>
      </div>

      {error && (
        <div className="card p-6 mb-6 bg-red-50 border border-red-200">
          <p className="text-red-600">⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes</h3>
          <p className="text-gray-600">No hay solicitudes en el estado "{filtro}"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((solicitud) => (
            <div key={solicitud.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(solicitud.estado)}`}>
                      {getEstadoTexto(solicitud.estado)}
                    </span>
                    <span className="text-xs text-gray-500">
                      📅 {solicitud.createdAt?.toDate?.() ? new Date(solicitud.createdAt.toDate()).toLocaleDateString('es-AR') : solicitud.createdAt || 'Fecha no disponible'}
                    </span>
                    <span className="text-xs text-gray-500">
                      👤 {solicitud.creadoPor || 'Desconocido'}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">
                    {solicitud.empleado?.nombre || 'Empleado no especificado'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                    <div>
                      <span className="font-medium">Legajo:</span> {solicitud.empleado?.legajo || '-'}
                    </div>
                    <div>
                      <span className="font-medium">Área Origen:</span> {solicitud.empleado?.areaOrigen?.nombre || 'No especificada'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Área Destino:</span> {solicitud.areaDestino?.nombre || 'No especificada'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Motivo:</span> {solicitud.motivo || 'Sin motivo especificado'}
                    </div>
                    {solicitud.observaciones && (
                      <div className="col-span-2 text-gray-600">
                        <span className="font-medium">Observaciones:</span> {solicitud.observaciones}
                      </div>
                    )}
                    {solicitud.motivoRechazo && (
                      <div className="col-span-2 text-red-600">
                        <span className="font-medium">Motivo de rechazo:</span> {solicitud.motivoRechazo}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones según rol y estado */}
                <div className="flex flex-col gap-2 min-w-[150px]">
                  {solicitud.estado === 'pendiente' && user?.rol === 'rrhh' && (
                    <>
                      <button
                        onClick={() => handleAprobar(solicitud.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm w-full"
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        onClick={() => handleRechazar(solicitud.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm w-full"
                      >
                        ❌ Rechazar
                      </button>
                    </>
                  )}

                  {solicitud.estado === 'rrhh_aprobado' && user?.rol === 'rrhh' && (
                    <span className="text-sm text-blue-600 font-medium text-center">
                      ⏳ Esperando aprobación de Subsecretaría
                    </span>
                  )}

                  {solicitud.estado === 'subsecretaria_aprobado' && user?.rol === 'rrhh' && (
                    <span className="text-sm text-green-600 font-medium text-center">
                      ✅ Aprobado - Pendiente de ejecución
                    </span>
                  )}

                  {solicitud.estado === 'finalizado' && (
                    <span className="text-sm text-gray-600 font-medium text-center">
                      ✅ Traspaso completado
                    </span>
                  )}

                  {solicitud.estado === 'rechazado' && (
                    <span className="text-sm text-red-600 font-medium text-center">
                      ❌ Rechazado
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}