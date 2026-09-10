// src/pages/RRHH/EmpleadosDisponibles.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, query, where } from '../../firebase';
import { fetchAllAreas } from '../../utils/areas';
import { formatearFecha } from '../../utils/fechas';
import { esEmpleadoADisposicion } from '../../utils/empleados';
import EmployeeDetailModal from '../../components/EmployeeDetailModal';
import { asignarEmpleadoAPedido, destinarEmpleadoDisponible, solicitarDestinoDesdeDisponibles } from '../../utils/traspasos';
import Swal from 'sweetalert2';

export default function EmpleadosDisponibles() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [areas, setAreas] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [pedidosAsignacion, setPedidosAsignacion] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [empleadoADestinar, setEmpleadoADestinar] = useState(null);
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [filtros, setFiltros] = useState({
    funcion: '',
    buscar: '',
    soloDisposicion: true
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [empSnapshot, areasData] = await Promise.all([getDocs(collection(db, 'empleados')), fetchAllAreas()]);
      const empleadosData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmpleados(empleadosData);
      setAreas(areasData.filter(area => !String(area.nombre).toLowerCase().includes('disposición de personal')));

      const solicitudesSnapshot = await getDocs(collection(db, 'solicitudes_traspaso'));
      const solicitudes = solicitudesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })).filter(solicitud => ['pendiente', 'rrhh_aprobado'].includes(solicitud.estado) && solicitud.empleado?.legajo);
      setSolicitudesPendientes(solicitudes);

      const pedidosSnapshot = await getDocs(
        query(collection(db, 'solicitudes_traspaso'), where('estado', '==', 'asignacion_pendiente'))
      );
      setPedidosAsignacion(pedidosSnapshot.docs.map(item => ({ id: item.id, ...item.data() }))
        .filter(item => item.tipoSolicitud === 'solicitud_personal'));

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const funcionesUnicas = [...new Set(empleados.map(e => e.funcion).filter(Boolean))].sort();

  const empleadosFiltrados = empleados.filter(emp => {
    const nombreCompleto = `${emp.nombre} ${emp.apellido}`.toLowerCase();
    const busqueda = filtros.buscar.toLowerCase();
    
    const coincideFuncion = !filtros.funcion || emp.funcion === filtros.funcion;
    const coincideBusqueda = !filtros.buscar || 
      nombreCompleto.includes(busqueda) || 
      emp.legajo?.includes(filtros.buscar);
    
    const coincideDisposicion = esEmpleadoADisposicion(emp);
    
    return coincideFuncion && coincideBusqueda && coincideDisposicion;
  });

  const tieneSolicitudPendiente = (legajo) => {
    return solicitudesPendientes.some(s => s.empleado?.legajo === legajo);
  };

  const getSolicitudPendiente = (legajo) => {
    return solicitudesPendientes.find(s => s.empleado?.legajo === legajo);
  };

  const pedidosCompatibles = (empleado) => pedidosAsignacion.filter(pedido =>
    (pedido.necesidades || []).some(item => item.funcion === empleado.funcion && Number(item.cantidadAsignada || 0) < Number(item.cantidad || 0))
  );

  const asignarAPedido = async (empleado, pedido) => {
    const result = await Swal.fire({
      title: '¿Asignar empleado?',
      html: `<strong>${empleado.nombre} ${empleado.apellido}</strong> será asignado a <strong>${pedido.areaDestino?.nombre || 'el área solicitante'}</strong>.`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, asignar', cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    try {
      const { completa } = await asignarEmpleadoAPedido(pedido.id, empleado);
      await Swal.fire('✅ Asignación realizada', completa ? 'El pedido fue completado.' : 'Aún quedan cupos por cubrir.', 'success');
      cargarDatos();
    } catch (error) {
      Swal.fire('❌ Error', error.message || 'No se pudo asignar el empleado.', 'error');
    }
  };

  const abrirDestino = (empleado) => { setEmpleadoADestinar(empleado); setAreaSeleccionada(''); };
  const cerrarDestino = () => { setEmpleadoADestinar(null); setAreaSeleccionada(''); };
  const confirmarDestino = async () => {
    const destino = areas.find(area => area.id === areaSeleccionada);
    if (!destino) { Swal.fire('⚠️', 'Seleccioná un área destino.', 'warning'); return; }
    try {
      if (user?.rol === 'subsecretario') {
        await destinarEmpleadoDisponible(empleadoADestinar, destino);
        await Swal.fire('✅ Destino asignado', `${empleadoADestinar.nombre} fue destinado a ${destino.nombre}.`, 'success');
      } else {
        await solicitarDestinoDesdeDisponibles(empleadoADestinar, destino, user?.email || '', `${user?.nombre || ''} ${user?.apellido || ''}`.trim());
        await Swal.fire('✅ Enviado a aprobación', `El destino a ${destino.nombre} quedó pendiente de la aprobación de Subsecretaría.`, 'success');
      }
      cerrarDestino(); cargarDatos();
    } catch (error) { Swal.fire('❌ Error', error.message || 'No se pudo registrar el destino.', 'error'); }
  };

  return (
    <div className="app-container">
      <div className="text-center mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Gestión de personal</p>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Empleados disponibles</h1>
        <p className="text-slate-600">Personal que se encuentra a disposición para nuevos destinos</p>
      </div>

      {!loading && pedidosAsignacion.length > 0 && (
        <div className="card p-5 mb-6 border border-purple-200 bg-purple-50">
          <h2 className="font-semibold text-purple-900">📌 Pedidos aprobados pendientes de asignación</h2>
          <div className="mt-3 space-y-2 text-sm text-purple-900">
            {pedidosAsignacion.map(pedido => (
              <div key={pedido.id}><strong>{pedido.areaDestino?.nombre}:</strong>{' '}
                {(pedido.necesidades || []).map(item => `${item.funcion} (${item.cantidadAsignada || 0}/${item.cantidad})`).join(' · ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <span className="font-semibold text-slate-700">{empleadosFiltrados.length}</span> empleados a disposición encontrados
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
            const esDisposicion = esEmpleadoADisposicion(emp);
            const pedidosEmpleado = pedidosCompatibles(emp);

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
                          {esDisposicion && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                              📌 A Disposición
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span><span className="font-medium">Legajo:</span> {emp.legajo}</span>
                          <span><span className="font-medium">Situación:</span> A Disposición de Personal</span>
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
                    {!tieneSolicitud && pedidosEmpleado.map(pedido => (
                      <button key={pedido.id} className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg" onClick={() => asignarAPedido(emp, pedido)}>
                        ➜ Asignar a {pedido.areaDestino?.nombre}
                      </button>
                    ))}
                    {!tieneSolicitud ? (
                      <button
                        className="btn-primary text-sm px-4 py-2"
                        onClick={() => abrirDestino(emp)}
                      >
                        ➜ Enviar a
                      </button>
                    ) : (
                      <div className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                        Solicitud pendiente a: {solicitud?.areaDestino?.nombre}
                      </div>
                    )}
                    <button
                      className="btn-secondary text-sm px-4 py-2"
                      onClick={() => setEmpleadoSeleccionado(emp)}
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
      {false && empleadoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">
                👤 {empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido}
              </h3>
              <button
                onClick={() => setEmpleadoSeleccionado(null)}
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
                onClick={() => setEmpleadoSeleccionado(null)}
                className="w-full btn-secondary py-2"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <EmployeeDetailModal empleado={empleadoSeleccionado} onClose={() => setEmpleadoSeleccionado(null)} />

      {empleadoADestinar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={cerrarDestino}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900">➜ Enviar a un área</h2>
            <p className="mt-2 text-sm text-slate-600">{empleadoADestinar.nombre} {empleadoADestinar.apellido} · Legajo {empleadoADestinar.legajo}</p>
            <label className="mt-5 block text-sm font-medium text-slate-700">Área destino</label>
            <select className="input-modern mt-2" value={areaSeleccionada} onChange={event => setAreaSeleccionada(event.target.value)}>
              <option value="">Seleccionar área...</option>
              {areas.map(area => <option key={area.id} value={area.id}>{area.nombre}</option>)}
            </select>
            <p className="mt-3 text-sm text-slate-500">
              {user?.rol === 'subsecretario' ? 'El destino se aplicará inmediatamente.' : 'El destino se enviará a Subsecretaría para su aprobación.'}
            </p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={cerrarDestino}>Cancelar</button><button type="button" className="btn-primary" onClick={confirmarDestino}>Confirmar destino</button></div>
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
            <span className="w-3 h-3 bg-purple-500 rounded"></span>
            <span>A Disposición de Personal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
