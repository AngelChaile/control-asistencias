// src/pages/RRHH/DashboardAnalisis.jsx - CORREGIDO

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, query, where } from '../../firebase';
import { fetchAllAreas } from '../../utils/areas';
import { Link } from 'react-router-dom';

export default function DashboardAnalisis() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [areasData, setAreasData] = useState([]);
  const [empleadosPorArea, setEmpleadosPorArea] = useState({});
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [filtroFuncion, setFiltroFuncion] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [funcionesUnicas, setFuncionesUnicas] = useState([]);
  const [areaExpandida, setAreaExpandida] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const areas = await fetchAllAreas();
      
      const empSnapshot = await getDocs(collection(db, 'empleados'));
      const empleados = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Agrupar por área
      const agrupado = {};
      empleados.forEach(emp => {
        const areaNombre = emp.area?.nombre || emp.lugarTrabajo || 'Sin área';
        if (!agrupado[areaNombre]) {
          agrupado[areaNombre] = {
            empleados: [],
            funciones: new Set()
          };
        }
        agrupado[areaNombre].empleados.push(emp);
        if (emp.funcion) agrupado[areaNombre].funciones.add(emp.funcion);
      });
      
      setEmpleadosPorArea(agrupado);
      
      const funciones = new Set();
      empleados.forEach(emp => {
        if (emp.funcion) funciones.add(emp.funcion);
      });
      setFuncionesUnicas(Array.from(funciones).sort());
      
      const solicitudesSnapshot = await getDocs(
        query(collection(db, 'solicitudes_traspaso'), where('estado', '==', 'pendiente'))
      );
      const solicitudes = solicitudesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSolicitudesPendientes(solicitudes);
      
      const areasConEmpleados = Object.keys(agrupado).map(nombre => ({
        nombre: nombre,
        total: agrupado[nombre].empleados.length,
        funciones: Array.from(agrupado[nombre].funciones),
        empleados: agrupado[nombre].empleados,
        tieneSolicitudes: solicitudes.some(s => 
          s.empleado?.areaOrigen?.nombre === nombre || 
          s.areaDestino?.nombre === nombre
        )
      }));
      
      setAreasData(areasConEmpleados);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const analizarNecesidad = (area, funcion) => {
    const empleadosArea = empleadosPorArea[area.nombre]?.empleados || [];
    const cantidad = empleadosArea.filter(e => e.funcion === funcion).length;
    
    if (cantidad > 3) return { estado: 'excedente', cantidad, color: 'bg-red-100 text-red-800', icon: '📈' };
    if (cantidad === 0) return { estado: 'falta', cantidad, color: 'bg-yellow-100 text-yellow-800', icon: '⚠️' };
    return { estado: 'ok', cantidad, color: 'bg-green-100 text-green-800', icon: '✅' };
  };

  // Función para mostrar empleados del área
  const toggleEmpleadosArea = (nombre) => {
    if (areaExpandida === nombre) {
      setAreaExpandida(null);
    } else {
      setAreaExpandida(nombre);
    }
  };

  // Formatear fecha
// Función CORREGIDA para formatear fecha (maneja string numérico)
const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  
  // Si es string y contiene un número (ej: "37151")
  if (typeof fecha === 'string' && !isNaN(parseFloat(fecha))) {
    const num = parseFloat(fecha);
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + num * 86400000);
    return date.toLocaleDateString('es-AR');
  }
  
  // Si es número de serie de Excel
  if (typeof fecha === 'number') {
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + fecha * 86400000);
    return date.toLocaleDateString('es-AR');
  }
  
  // Si es string tipo "YYYY-MM-DD"
  if (typeof fecha === 'string') {
    let parts = fecha.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return date.toLocaleDateString('es-AR');
    }
    // Si es "DD/MM/YYYY"
    parts = fecha.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      const date = new Date(parts[2], parts[1] - 1, parts[0]);
      return date.toLocaleDateString('es-AR');
    }
    return fecha;
  }
  
  // Si es Timestamp de Firestore
  if (fecha?.toDate) {
    return fecha.toDate().toLocaleDateString('es-AR');
  }
  
  // Si es Date
  if (fecha instanceof Date) {
    return fecha.toLocaleDateString('es-AR');
  }
  
  return fecha;
};

  return (
    <div className="app-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Dashboard de Análisis de Personal</h1>
        <p className="text-gray-600">Visualiza las necesidades y excedentes de personal por área</p>
      </div>

      {/* Filtros */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Función</label>
            <select
              className="input-modern"
              value={filtroFuncion}
              onChange={(e) => setFiltroFuncion(e.target.value)}
            >
              <option value="">Todas las funciones</option>
              {funcionesUnicas.map(func => (
                <option key={func} value={func}>{func}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Área</label>
            <input
              className="input-modern"
              placeholder="Nombre del área..."
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {areasData
            .filter(area => 
              area.nombre.toLowerCase().includes(filtroArea.toLowerCase()) &&
              (!filtroFuncion || area.funciones.includes(filtroFuncion))
            )
            .map(area => (
              <div key={area.nombre} className={`card p-6 ${area.tieneSolicitudes ? 'border-2 border-yellow-400' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{area.nombre}</h3>
                    <p className="text-sm text-gray-600">{area.total} empleados</p>
                  </div>
                  {area.tieneSolicitudes && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      🟡 Solicitud pendiente
                    </span>
                  )}
                </div>

                {/* Funciones y cantidades */}
                <div className="space-y-3">
                  {area.funciones.map(funcion => {
                    const analisis = analizarNecesidad(area, funcion);
                    return (
                      <div key={funcion} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{funcion}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${analisis.color}`}>
                            {analisis.icon} {analisis.cantidad}
                          </span>
                          {analisis.estado === 'excedente' && (
                            <Link 
                              to={`/rrhh/empleados-disponibles?area=${encodeURIComponent(area.nombre)}&funcion=${encodeURIComponent(funcion)}`}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Ver disponibles →
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón para ver empleados del área */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button 
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => toggleEmpleadosArea(area.nombre)}
                  >
                    {areaExpandida === area.nombre ? '🔼 Ocultar empleados' : `👥 Ver empleados (${area.total})`}
                  </button>
                  
                  {areaExpandida === area.nombre && (
                    <div className="mt-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Empleado</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Legajo</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Función</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ingreso</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {area.empleados.map(emp => (
                            <tr key={emp.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                                {emp.nombre} {emp.apellido}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{emp.legajo}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{emp.funcion || '-'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatearFecha(emp.fechaIngreso)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Solicitudes Pendientes */}
      {solicitudesPendientes.length > 0 && (
        <div className="card p-6 mt-6 border-yellow-400 border-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🔄</span> Solicitudes de Traspaso Pendientes ({solicitudesPendientes.length})
          </h3>
          <div className="space-y-3">
            {solicitudesPendientes.map(solicitud => (
              <div key={solicitud.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      {solicitud.empleado?.nombre} ({solicitud.empleado?.legajo})
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Origen:</span> {solicitud.empleado?.areaOrigen?.nombre || 'No especificado'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Destino:</span> {solicitud.areaDestino?.nombre}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Motivo:</span> {solicitud.motivo}
                    </p>
                  </div>
                  <Link 
                    to={`/rrhh/gestion-solicitudes`}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    Gestionar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}