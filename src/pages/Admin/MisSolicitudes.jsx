// src/pages/Admin/MisSolicitudes.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, query, where, orderBy } from '../../firebase';

export default function MisSolicitudes() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    setLoading(true);
    try {
      // Obtener solicitudes creadas por el usuario
      const q = query(
        collection(db, 'solicitudes_traspaso'),
        where('creadoPor', '==', user?.email),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSolicitudes(data);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
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
      'pendiente': 'Pendiente',
      'rrhh_aprobado': 'Aprobado por RRHH',
      'subsecretaria_aprobado': 'Aprobado por Subsecretaría',
      'rechazado': 'Rechazado',
      'finalizado': 'Finalizado'
    };
    return textos[estado] || estado;
  };

  return (
    <div className="app-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Solicitudes de Traspaso</h1>
        <p className="text-gray-600">Seguimiento de tus solicitudes de traspaso de personal</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes solicitudes</h3>
          <p className="text-gray-600">Aún no has realizado ninguna solicitud de traspaso</p>
          <a href="/admin/solicitar-traspaso" className="btn-primary mt-4 inline-block">
            📝 Crear Solicitud
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((solicitud) => (
            <div key={solicitud.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(solicitud.estado)}`}>
                      {getEstadoTexto(solicitud.estado)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(solicitud.createdAt?.toDate?.() || solicitud.createdAt).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {solicitud.empleado?.nombre}
                  </h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Legajo:</span> {solicitud.empleado?.legajo}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Área Origen:</span> {solicitud.empleado?.areaOrigen?.nombre}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Área Destino:</span> {solicitud.areaDestino?.nombre}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Motivo:</span> {solicitud.motivo}
                  </p>
                  {solicitud.motivoRechazo && (
                    <p className="text-sm text-red-600 mt-2">
                      <span className="font-medium">Motivo de rechazo:</span> {solicitud.motivoRechazo}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {solicitud.estado === 'finalizado' && (
                    <span className="text-sm text-green-600 font-medium">✅ Traspaso completado</span>
                  )}
                  {solicitud.estado === 'pendiente' && (
                    <span className="text-sm text-yellow-600 font-medium">⏳ En espera de revisión</span>
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