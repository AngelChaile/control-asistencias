// src/pages/Admin/SolicitudTraspaso.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, addDoc, getDocs, query, where } from '../../firebase';
import { fetchAllAreas, searchAreas } from '../../utils/areas';
import { crearSolicitudTraspaso } from '../../utils/traspasos';
import Swal from 'sweetalert2';

export default function SolicitudTraspaso() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [areas, setAreas] = useState([]);
  const [areasFiltradas, setAreasFiltradas] = useState([]);
  const [busquedaArea, setBusquedaArea] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  const [solicitud, setSolicitud] = useState({
    empleado: null,
    areaDestino: null,
    motivo: '',
    tipoTraspaso: 'interna',
    observaciones: '',
    creadoPor: user?.email || '',
    creadorNombre: `${user?.nombre || ''} ${user?.apellido || ''}`,
    areaOrigen: null
  });

  useEffect(() => {
    cargarDatos();
    // Verificar si hay legajo en la URL (desde EmpleadosDisponibles)
    const params = new URLSearchParams(window.location.search);
    const legajo = params.get('legajo');
    if (legajo) {
      buscarEmpleadoPorLegajo(legajo);
    }
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const areasData = await fetchAllAreas();
      setAreas(areasData);
      setAreasFiltradas(areasData);

      const empSnapshot = await getDocs(collection(db, 'empleados'));
      const empleadosData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmpleados(empleadosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarEmpleadoPorLegajo = async (legajo) => {
    try {
      const empSnapshot = await getDocs(
        query(collection(db, 'empleados'), where('legajo', '==', legajo))
      );
      if (!empSnapshot.empty) {
        const emp = { id: empSnapshot.docs[0].id, ...empSnapshot.docs[0].data() };
        seleccionarEmpleado(emp);
      }
    } catch (error) {
      console.error('Error buscando empleado:', error);
    }
  };

  const buscarEmpleado = async (text) => {
    setBusquedaEmpleado(text);
    if (text.length > 1) {
      const empSnapshot = await getDocs(collection(db, 'empleados'));
      const resultados = empSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(emp => 
          `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(text.toLowerCase()) ||
          emp.legajo?.includes(text)
        );
      setEmpleados(resultados);
    } else {
      const empSnapshot = await getDocs(collection(db, 'empleados'));
      const empleadosData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmpleados(empleadosData);
    }
  };

  const seleccionarEmpleado = (emp) => {
    const areaOrigen = emp.area || {
      id: emp.lugarTrabajo || 'sin-area',
      nombre: emp.lugarTrabajo || 'Sin área asignada',
      ruta: emp.lugarTrabajo || ''
    };

    setEmpleadoSeleccionado(emp);
    setSolicitud({
      ...solicitud,
      empleado: {
        legajo: emp.legajo,
        nombre: `${emp.nombre} ${emp.apellido}`,
        areaOrigen: {
          id: areaOrigen.id,
          nombre: areaOrigen.nombre,
          ruta: areaOrigen.ruta || areaOrigen.nombre
        }
      },
      areaOrigen: areaOrigen
    });
    setBusquedaEmpleado(`${emp.nombre} ${emp.apellido} (${emp.legajo})`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!solicitud.empleado || !solicitud.areaDestino) {
      Swal.fire('⚠️', 'Debes seleccionar un empleado y un área destino', 'warning');
      return;
    }

    if (solicitud.empleado.areaOrigen?.id === solicitud.areaDestino.id) {
      Swal.fire('⚠️', 'El empleado ya está en esta área', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        empleado: solicitud.empleado,
        areaDestino: solicitud.areaDestino,
        motivo: solicitud.motivo,
        tipoTraspaso: solicitud.tipoTraspaso,
        observaciones: solicitud.observaciones,
        creadoPor: user?.email || '',
        creadorNombre: `${user?.nombre || ''} ${user?.apellido || ''}`,
        estado: 'pendiente',
        aprobaciones: {
          rrhh: { estado: 'pendiente', fecha: null, observaciones: null },
          subsecretaria: { estado: 'pendiente', fecha: null, observaciones: null }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'solicitudes_traspaso'), payload);
      
      Swal.fire('✅', 'Solicitud creada exitosamente', 'success');
      setSolicitudEnviada(true);
      
      // Resetear formulario
      setSolicitud({
        empleado: null,
        areaDestino: null,
        motivo: '',
        tipoTraspaso: 'interna',
        observaciones: '',
        creadoPor: user?.email || '',
        creadorNombre: `${user?.nombre || ''} ${user?.apellido || ''}`,
        areaOrigen: null
      });
      setEmpleadoSeleccionado(null);
      setBusquedaEmpleado('');
      setBusquedaArea('');
      
    } catch (error) {
      console.error('Error creando solicitud:', error);
      Swal.fire('❌', 'Error al crear la solicitud: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📝 Solicitud de Traspaso</h1>
        <p className="text-gray-600">Solicita el traspaso de un empleado a otra área</p>
      </div>

      {solicitudEnviada && (
        <div className="card p-6 mb-6 bg-green-50 border border-green-200">
          <p className="text-green-800">✅ Solicitud enviada correctamente. Espera la aprobación de RRHH.</p>
        </div>
      )}

      <div className="card p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de Empleado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👤 Empleado a traspasar *
            </label>
            <input
              className="input-modern"
              placeholder="Buscar por nombre o legajo..."
              value={busquedaEmpleado}
              onChange={(e) => buscarEmpleado(e.target.value)}
            />
            {empleados.length > 0 && busquedaEmpleado && (
              <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {empleados.map(emp => (
                  <div
                    key={emp.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                    onClick={() => seleccionarEmpleado(emp)}
                  >
                    <div className="font-medium">{emp.nombre} {emp.apellido}</div>
                    <div className="text-sm text-gray-600">Legajo: {emp.legajo} | Área: {emp.area?.nombre || emp.lugarTrabajo || 'Sin área'}</div>
                  </div>
                ))}
              </div>
            )}
            {empleadoSeleccionado && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  ✅ {empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido} (Legajo: {empleadoSeleccionado.legajo})
                </p>
                <p className="text-xs text-green-600">Área actual: {empleadoSeleccionado.area?.nombre || empleadoSeleccionado.lugarTrabajo || 'Sin área'}</p>
              </div>
            )}
          </div>

          {/* Selección de Área Destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏢 Área Destino *
            </label>
            <input
              className="input-modern"
              placeholder="Buscar área destino..."
              value={busquedaArea}
              onChange={(e) => {
                setBusquedaArea(e.target.value);
                const filtered = areas.filter(a => 
                  a.nombre.toLowerCase().includes(e.target.value.toLowerCase())
                );
                setAreasFiltradas(filtered);
                setMostrarDropdown(true);
              }}
              onFocus={() => setMostrarDropdown(true)}
              onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)}
            />
            {mostrarDropdown && areasFiltradas.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {areasFiltradas.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
                    onMouseDown={() => {
                      setSolicitud({ ...solicitud, areaDestino: area });
                      setBusquedaArea(area.nombre);
                      setMostrarDropdown(false);
                    }}
                  >
                    <div className="font-medium">{area.nombre}</div>
                    <div className="text-xs text-gray-500">{area.id}</div>
                  </button>
                ))}
              </div>
            )}
            {solicitud.areaDestino && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">✅ {solicitud.areaDestino.nombre}</p>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Motivo del Traspaso *
            </label>
            <textarea
              className="input-modern"
              rows="3"
              placeholder="Explica el motivo del traspaso..."
              value={solicitud.motivo}
              onChange={(e) => setSolicitud({ ...solicitud, motivo: e.target.value })}
              required
            />
          </div>

          {/* Tipo de Traspaso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔄 Tipo de Traspaso
            </label>
            <select
              className="input-modern"
              value={solicitud.tipoTraspaso}
              onChange={(e) => setSolicitud({ ...solicitud, tipoTraspaso: e.target.value })}
            >
              <option value="interna">Interna (a otra área)</option>
              <option value="disposicion">A disposición de Personal</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📋 Observaciones Adicionales
            </label>
            <textarea
              className="input-modern"
              rows="2"
              placeholder="Información adicional..."
              value={solicitud.observaciones}
              onChange={(e) => setSolicitud({ ...solicitud, observaciones: e.target.value })}
            />
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={loading || solicitudEnviada}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                Procesando...
              </div>
            ) : solicitudEnviada ? (
              '✅ Solicitud Enviada'
            ) : (
              '📤 Enviar Solicitud'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}