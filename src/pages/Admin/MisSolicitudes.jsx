// src/pages/Admin/MisSolicitudes.jsx - CORREGIDO

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, query, where, orderBy } from '../../firebase';
import { Link } from 'react-router-dom';

export default function MisSolicitudes() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar solicitudes creadas por el usuario
      const q = query(
        collection(db, 'solicitudes_traspaso'),
        where('creadoPor', '==', user?.email)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar manualmente por fecha
      data.sort((a, b) => {
        const fechaA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const fechaB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return fechaB - fechaA;
      });
      
      setSolicitudes(data);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 Mis Solicitudes de Traspaso</h1>
        <p className="text-gray-600">Seguimiento de tus solicitudes de traspaso de personal</p>
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
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes solicitudes</h3>
          <p className="text-gray-600">Aún no has realizado ninguna solicitud de traspaso</p>
          <Link to="/admin/solicitar-traspaso" className="btn-primary mt-4 inline-block">
            📝 Crear Solicitud
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((solicitud) => (
            <div key={solicitud.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(solicitud.estado)}`}>
                      {getEstadoTexto(solicitud.estado)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {solicitud.createdAt?.toDate?.() ? new Date(solicitud.createdAt.toDate()).toLocaleDateString('es-AR') : solicitud.createdAt || 'Fecha no disponible'}
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
                    {solicitud.motivoRechazo && (
                      <div className="col-span-2 text-red-600">
                        <span className="font-medium">Motivo de rechazo:</span> {solicitud.motivoRechazo}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[120px]">
                  {solicitud.estado === 'pendiente' && (
                    <span className="text-sm text-yellow-600 font-medium text-center">
                      ⏳ En espera de revisión
                    </span>
                  )}
                  {solicitud.estado === 'finalizado' && (
                    <span className="text-sm text-green-600 font-medium text-center">
                      ✅ Traspaso completado
                    </span>
                  )}
                  {solicitud.estado === 'rechazado' && (
                    <span className="text-sm text-red-600 font-medium text-center">
                      ❌ Rechazado
                    </span>
                  )}
                  {solicitud.estado === 'rrhh_aprobado' && (
                    <span className="text-sm text-blue-600 font-medium text-center">
                      ✅ Aprobado por RRHH
                    </span>
                  )}
                  {solicitud.estado === 'subsecretaria_aprobado' && (
                    <span className="text-sm text-green-600 font-medium text-center">
                      ✅ Aprobado por Subsecretaría
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