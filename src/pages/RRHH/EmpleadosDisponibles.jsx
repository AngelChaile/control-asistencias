// src/pages/RRHH/EmpleadosDisponibles.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, query, where } from '../../firebase';
import { fetchAllAreas } from '../../utils/areas';
import { useNavigate } from 'react-router-dom';

export default function EmpleadosDisponibles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [empleadosPorArea, setEmpleadosPorArea] = useState({});
  const [filtros, setFiltros] = useState({
    area: '',
    funcion: '',
    buscar: ''
  });

  // 📅 Función para formatear fecha CORREGIDA
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    
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
      
      // Si es string tipo "DD/MM/YYYY"
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

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const areasData = await fetchAllAreas();
      const empSnapshot = await getDocs(collection(db, 'empleados'));
      const empleadosData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmpleados(empleadosData);

      const agrupado = {};
      empleadosData.forEach(emp => {
        const areaNombre = emp.area?.nombre || emp.lugarTrabajo || 'Sin área';
        if (!agrupado[areaNombre]) {
          agrupado[areaNombre] = [];
        }
        agrupado[areaNombre].push(emp);
      });
      setEmpleadosPorArea(agrupado);

      const solicitudesSnapshot = await getDocs(
        query(collection(db, 'solicitudes_traspaso'), where('estado', '==', 'pendiente'))
      );
      const solicitudes = solicitudesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setSolicitudesPendientes(solicitudes);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const funcionesUnicas = [...new Set(empleados.map(e => e.funcion).filter(Boolean))].sort();

  const empleadosFiltrados = empleados.filter(emp => {
    const areaNombre = emp.area?.nombre || emp.lugarTrabajo || '';
    const nombreCompleto = `${emp.nombre} ${emp.apellido}`.toLowerCase();
    const busqueda = filtros.buscar.toLowerCase();
    
    const coincideArea = !filtros.area || areaNombre.toLowerCase().includes(filtros.area.toLowerCase());
    const coincideFuncion = !filtros.funcion || emp.funcion === filtros.funcion;
    const coincideBusqueda = !filtros.buscar || 
      nombreCompleto.includes(busqueda) || 
      emp.legajo?.includes(filtros.buscar);
    
    return coincideArea && coincideFuncion && coincideBusqueda;
  });

  const tieneSolicitudPendiente = (legajo) => {
    return solicitudesPendientes.some(s => s.empleado?.legajo === legajo);
  };

  const getSolicitudPendiente = (legajo) => {
    return solicitudesPendientes.find(s => s.empleado?.legajo === legajo);
  };

  const analizarExcedente = (areaNombre, funcion) => {
    const empleadosArea = empleadosPorArea[areaNombre] || [];
    const cantidad = empleadosArea.filter(e => e.funcion === funcion).length;
    return cantidad > 3;
  };

  return (
    <div className="app-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Empleados Disponibles para Traspaso</h1>
        <p className="text-gray-600">Visualiza y analiza el personal disponible por área y función</p>
      </div>

      {/* Filtros */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              className="input-modern"
              placeholder="Nombre, legajo..."
              value={filtros.buscar}
              onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Área</label>
            <input
              className="input-modern"
              placeholder="Nombre del área..."
              value={filtros.area}
              onChange={(e) => setFiltros({ ...filtros, area: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Función</label>
            <select
              className="input-modern"
              value={filtros.funcion}
              onChange={(e) => setFiltros({ ...filtros, funcion: e.target.value })}
            >
              <option value="">Todas las funciones</option>
              {funcionesUnicas.map(func => (
                <option key={func} value={func}>{func}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          {empleadosFiltrados.length} empleados encontrados
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
        </div>
      ) : empleadosFiltrados.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron empleados</h3>
          <p className="text-gray-600">Prueba con otros filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {empleadosFiltrados.map((emp) => {
            const tieneSolicitud = tieneSolicitudPendiente(emp.legajo);
            const solicitud = getSolicitudPendiente(emp.legajo);
            const areaNombre = emp.area?.nombre || emp.lugarTrabajo || 'Sin área';
            const hayExcedente = analizarExcedente(areaNombre, emp.funcion);

            return (
              <div 
                key={emp.id} 
                className={`card p-6 hover:shadow-md transition-all ${
                  tieneSolicitud ? 'border-l-4 border-yellow-500' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-medium text-lg">
                          {emp.nombre?.[0]}{emp.apellido?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {emp.nombre} {emp.apellido}
                          </h3>
                          {tieneSolicitud && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              🔄 Solicitud pendiente
                            </span>
                          )}
                          {hayExcedente && !tieneSolicitud && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                              📈 Excedente
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span><span className="font-medium">Legajo:</span> {emp.legajo}</span>
                          <span><span className="font-medium">Área:</span> {areaNombre}</span>
                          {emp.funcion && (
                            <span><span className="font-medium">Función:</span> {emp.funcion}</span>
                          )}
                          {emp.categoria && (
                            <span><span className="font-medium">Categoría:</span> {emp.categoria}</span>
                          )}
                          <span><span className="font-medium">Ingreso:</span> {formatearFecha(emp.fechaIngreso)}</span>
                          <span><span className="font-medium">Partición:</span> {emp.particion || 'Municipal'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!tieneSolicitud ? (
                      <button
                        className="btn-primary text-sm px-4 py-2"
                        onClick={() => navigate(`/admin/solicitar-traspaso?legajo=${emp.legajo}`)}
                      >
                        📝 Solicitar Traspaso
                      </button>
                    ) : (
                      <div className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                        Solicitud pendiente a: {solicitud?.areaDestino?.nombre}
                      </div>
                    )}
                    <button
                      className="btn-secondary text-sm px-4 py-2"
                      onClick={() => {
                        alert(`👤 ${emp.nombre} ${emp.apellido}\nLegajo: ${emp.legajo}\nÁrea: ${areaNombre}\nFunción: ${emp.funcion || 'No asignada'}\nCategoría: ${emp.categoria || 'No asignada'}\nIngreso: ${formatearFecha(emp.fechaIngreso)}`);
                      }}
                    >
                      👁️ Ver Detalle
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {emp.tipoCargo === 'temporario' && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                      ⏳ Temporario
                    </span>
                  )}
                  {emp.estado === 'inactivo' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                      ⛔ Inactivo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">📋 Leyenda</h4>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded"></span>
            <span>Solicitud pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded"></span>
            <span>Excedente (más de 3 personas con misma función)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded"></span>
            <span>Empleado temporario</span>
          </div>
        </div>
      </div>
    </div>
  );
}