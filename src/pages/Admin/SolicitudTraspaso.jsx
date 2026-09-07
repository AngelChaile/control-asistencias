// src/pages/Admin/SolicitudTraspaso.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, addDoc, getDocs, query, where } from '../../firebase';
import { fetchAllAreas, searchAreas } from '../../utils/areas';

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

  const [solicitud, setSolicitud] = useState({
    empleado: null,
    areaDestino: null,
    motivo: '',
    tipoTraspaso: 'interna',
    observaciones: '',
    firmaEncargado: null,
    firmaEmpleado: null
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar áreas
      const areasData = await fetchAllAreas();
      setAreas(areasData);
      setAreasFiltradas(areasData);

      // Cargar empleados del área del usuario
      const empSnapshot = await getDocs(
        query(collection(db, 'empleados'), where('lugarTrabajo', '==', user?.lugarTrabajo || ''))
      );
      const empleadosData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmpleados(empleadosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarEmpleado = async (text) => {
    setBusquedaEmpleado(text);
    if (text.length > 1) {
      // Buscar en todos los empleados (no solo del área)
      const empSnapshot = await getDocs(collection(db, 'empleados'));
      const resultados = empSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(emp => 
          `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(text.toLowerCase()) ||
          emp.legajo?.includes(text)
        );
      setEmpleados(resultados);
    } else {
      // Mostrar solo los del área
      const empSnapshot = await getDocs(
        query(collection(db, 'empleados'), where('lugarTrabajo', '==', user?.lugarTrabajo || ''))
      );
      const empleadosData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmpleados(empleadosData);
    }
  };

  const seleccionarEmpleado = (emp) => {
    setEmpleadoSeleccionado(emp);
    setSolicitud({ ...solicitud, empleado: emp });
    setBusquedaEmpleado(`${emp.nombre} ${emp.apellido} (${emp.legajo})`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!solicitud.empleado || !solicitud.areaDestino) {
      alert('Debes seleccionar un empleado y un área destino');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'solicitudes_traspaso'), {
        ...solicitud,
        empleado: {
          legajo: solicitud.empleado.legajo,
          nombre: `${solicitud.empleado.nombre} ${solicitud.empleado.apellido}`,
          areaOrigen: solicitud.empleado.area
        },
        areaDestino: solicitud.areaDestino,
        estado: 'pendiente',
        creadoPor: user?.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('✅ Solicitud creada exitosamente');
      // Resetear formulario
      setSolicitud({ empleado: null, areaDestino: null, motivo: '', tipoTraspaso: 'interna', observaciones: '' });
      setEmpleadoSeleccionado(null);
      setBusquedaEmpleado('');
    } catch (error) {
      console.error('Error creando solicitud:', error);
      alert('❌ Error al crear la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitud de Traspaso</h1>
        <p className="text-gray-600">Solicita el traspaso de un empleado a otra área</p>
      </div>

      <div className="card p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de Empleado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empleado a traspasar *
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
                    <div className="text-sm text-gray-600">Legajo: {emp.legajo} | Área: {emp.lugarTrabajo}</div>
                  </div>
                ))}
              </div>
            )}
            {empleadoSeleccionado && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  ✅ {empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido} (Legajo: {empleadoSeleccionado.legajo})
                </p>
                <p className="text-xs text-green-600">Área actual: {empleadoSeleccionado.lugarTrabajo}</p>
              </div>
            )}
          </div>

          {/* Selección de Área Destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Área Destino *
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
              Motivo del Traspaso *
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
              Tipo de Traspaso
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
              Observaciones Adicionales
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
            disabled={loading}
            className="w-full btn-primary py-3"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                Procesando...
              </div>
            ) : (
              '📤 Enviar Solicitud'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}