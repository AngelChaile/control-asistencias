// src/pages/RRHH/EmpleadosDisponibles.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, query, where } from '../../firebase';
import { fetchAllAreas } from '../../utils/areas';
import { formatearFecha } from '../../utils/fechas';
import { useNavigate } from 'react-router-dom';

export default function EmpleadosDisponibles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [empleadosPorArea, setEmpleadosPorArea] = useState({});
  const [mostrarModal, setMostrarModal] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState({
    area: '',
    funcion: '',
    buscar: '',
    soloDisposicion: false
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
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
    
    // 🔥 FILTRO "A DISPOSICIÓN": solo empleados sin área o con área "Disposición"
    const esDisposicion = emp.lugarTrabajo?.toLowerCase().includes('disposicion') || 
                          emp.area?.nombre?.toLowerCase().includes('disposicion');
    const coincideDisposicion = !filtros.soloDisposicion || esDisposicion;
    
    return coincideArea && coincideFuncion && coincideBusqueda && coincideDisposicion;
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

  const abrirModal = (emp) => {
    setEmpleadoSeleccionado(emp);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEmpleadoSeleccionado(null);
  };

  return (
    <div className="app-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Empleados Disponibles para Traspaso</h1>
        <p className="text-gray-600">Visualiza y analiza el personal disponible por área y función</p>
      </div>

      {/* Filtros */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-municipio-500 rounded"
                checked={filtros.soloDisposicion}
                onChange={(e) => setFiltros({ ...filtros, soloDisposicion: e.target.checked })}
              />
              <span className="text-sm text-gray-700">Solo "A Disposición"</span>
            </label>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          {empleadosFiltrados.length} empleados encontrados
          {filtros.soloDisposicion && ' (Filtro: A Disposición)'}
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
            const esDisposicion = emp.lugarTrabajo?.toLowerCase().includes('disposicion') || 
                                  emp.area?.nombre?.toLowerCase().includes('disposicion');

            return (
              <div 
                key={emp.id} 
                className={`card p-6 hover:shadow-md transition-all ${
                  tieneSolicitud ? 'border-l-4 border-yellow-500' : ''
                } ${esDisposicion ? 'border-l-4 border-purple-500' : ''}`}
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
                          {esDisposicion && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                              📌 A Disposición
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
                      onClick={() => abrirModal(emp)}
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

      {/* 🟢 MODAL DE DETALLE DE EMPLEADO */}
      {mostrarModal && empleadoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">
                👤 {empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido}
              </h3>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* DATOS PERSONALES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Legajo</p>
                  <p className="font-medium">{empleadoSeleccionado.legajo}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Documento</p>
                  <p className="font-medium">{empleadoSeleccionado.documento || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{empleadoSeleccionado.email || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <p className="font-medium">{empleadoSeleccionado.telefono || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Domicilio</p>
                  <p className="font-medium">{empleadoSeleccionado.domicilio || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Fecha de Nacimiento</p>
                  <p className="font-medium">{formatearFecha(empleadoSeleccionado.fechaNacimiento)}</p>
                </div>
              </div>

              {/* DATOS LABORALES */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">💼 Datos Laborales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Área</p>
                    <p className="font-medium">{empleadoSeleccionado.area?.nombre || empleadoSeleccionado.lugarTrabajo || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Función</p>
                    <p className="font-medium">{empleadoSeleccionado.funcion || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Categoría</p>
                    <p className="font-medium">{empleadoSeleccionado.categoria || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Partición</p>
                    <p className="font-medium">{empleadoSeleccionado.particion || 'Municipal'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Tipo de Cargo</p>
                    <p className="font-medium">{empleadoSeleccionado.tipoCargo || 'Permanente'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Horario</p>
                    <p className="font-medium">{empleadoSeleccionado.horario || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Fecha de Ingreso</p>
                    <p className="font-medium">{formatearFecha(empleadoSeleccionado.fechaIngreso)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Estado</p>
                    <p className="font-medium">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        empleadoSeleccionado.estado === 'activo' ? 'bg-green-100 text-green-800' :
                        empleadoSeleccionado.estado === 'inactivo' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {empleadoSeleccionado.estado || 'activo'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* HISTORIAL DE TRASPASOS */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">📜 Historial de Traspasos</h4>
                {empleadoSeleccionado.historialTraspasos?.length > 0 ? (
                  <div className="space-y-2">
                    {empleadoSeleccionado.historialTraspasos.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{item.areaOrigen || item.area}</p>
                          <p className="text-xs text-gray-500">{item.motivo || 'Traspaso'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatearFecha(item.fecha)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay traspasos registrados</p>
                )}
              </div>

              {/* HISTORIAL LABORAL */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">📋 Historial Laboral</h4>
                {empleadoSeleccionado.historialLaboral?.length > 0 ? (
                  <div className="space-y-2">
                    {empleadoSeleccionado.historialLaboral.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{item.area || item.empresa || '-'}</p>
                          <p className="text-xs text-gray-500">{item.cargo || item.funcion || '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatearFecha(item.fechaInicio)} - {formatearFecha(item.fechaFin) || 'Actual'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay historial laboral registrado</p>
                )}
              </div>

              <button
                onClick={cerrarModal}
                className="w-full btn-secondary py-2"
              >
                Cerrar
              </button>
            </div>
          </div>
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
            <span className="w-3 h-3 bg-purple-500 rounded"></span>
            <span>A Disposición de Personal</span>
          </div>
        </div>
      </div>
    </div>
  );
}