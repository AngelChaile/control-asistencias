import React, { useEffect, useState } from "react";
import {
  db,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { fetchAllAreas, searchAreas } from "../../utils/areas";

export default function EmpleadosAdmin() {
  const { user } = useAuth();
  const area = user?.lugarTrabajo || "";
  const [empleados, setEmpleados] = useState([]);
  const [areas, setAreas] = useState([]);
  const [areasFiltradas, setAreasFiltradas] = useState([]);
  const [busquedaArea, setBusquedaArea] = useState("");
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [filter, setFilter] = useState({ legajo: "", nombre: "" });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [nuevo, setNuevo] = useState({
    legajo: "",
    nombre: "",
    apellido: "",
    documento: "",
    email: "",
    telefono: "",
    lugarTrabajo: area,
    secretaria: "",
    horario: "",
    categoria: "",
    funcion: "",
    particion: "municipal",      // ← Cambiado
    tipoCargo: "permanente",     // ← Cambiado
    area: null,
    fechaIngreso: "",
    estado: "activo",
    activo: true,
    rol: "empleado"
  });

  // Cargar áreas
  useEffect(() => {
    const loadAreas = async () => {
      const data = await fetchAllAreas();
      setAreas(data);
      setAreasFiltradas(data);
    };
    loadAreas();
  }, []);

  // Cargar empleados
  useEffect(() => {
    if (!area) return;
    fetchEmpleados();
  }, [area]);

  async function fetchEmpleados() {
    setLoading(true);
    try {
      const q = query(collection(db, "empleados"), where("lugarTrabajo", "==", area));
      const snap = await getDocs(q);
      setEmpleados(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("fetchEmpleados admin:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardar(e) {
    e.preventDefault();
    try {
      const payload = { 
        ...nuevo, 
        lugarTrabajo: area,
        area: nuevo.area || null
      };
      
      if (editingId) {
        await updateDoc(doc(db, "empleados", editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "empleados"), payload);
      }
      
      resetForm();
      fetchEmpleados();
    } catch (err) {
      console.error("guardar empleado admin:", err);
    }
  }

  function resetForm() {
    setNuevo({
      legajo: "",
      nombre: "",
      apellido: "",
      documento: "",
      email: "",
      telefono: "",
      lugarTrabajo: area,
      secretaria: "",
      horario: "",
      categoria: "",
      funcion: "",
      particion: "municipal",
      tipoCargo: "permanente",
      area: null,
      fechaIngreso: "",
      estado: "activo",
      activo: true,
      rol: "empleado"
    });
    setBusquedaArea("");
    setEditingId(null);
  }

  function handleEditar(emp) {
    setEditingId(emp.id);
    setNuevo({
      legajo: emp.legajo || "",
      nombre: emp.nombre || "",
      apellido: emp.apellido || "",
      documento: emp.documento || "",
      email: emp.email || "",
      telefono: emp.telefono || "",
      lugarTrabajo: emp.lugarTrabajo || area,
      secretaria: emp.secretaria || "",
      horario: emp.horario || "",
      categoria: emp.categoria || "",
      funcion: emp.funcion || "",
      particion: emp.particion || "municipal",
      tipoCargo: emp.tipoCargo || "permanente",
      area: emp.area || null,
      fechaIngreso: emp.fechaIngreso || "",
      estado: emp.estado || "activo",
      activo: emp.activo !== undefined ? emp.activo : true,
      rol: emp.rol || "empleado"
    });
    
    if (emp.area) {
      setBusquedaArea(emp.area.nombre);
    }
  }

  async function handleEliminar(id) {
    if (!window.confirm("¿Estás seguro de eliminar este empleado?")) return;
    try {
      await deleteDoc(doc(db, "empleados", id));
      fetchEmpleados();
    } catch (err) {
      console.error("eliminar empleado admin:", err);
    }
  }

  // Funciones de área
  const handleBusquedaArea = async (text) => {
    setBusquedaArea(text);
    if (text.length > 1) {
      const resultados = await searchAreas(text);
      setAreasFiltradas(resultados);
      setMostrarDropdown(true);
    } else {
      setAreasFiltradas(areas);
      setMostrarDropdown(false);
    }
  };

  const seleccionarArea = (area) => {
    setNuevo({
      ...nuevo,
      area: {
        id: area.id,
        nombre: area.nombre,
        ruta: area.ruta || area.nombre
      }
    });
    setBusquedaArea(area.nombre);
    setMostrarDropdown(false);
  };

  // Filtros
  const filtered = empleados.filter(
    (e) =>
      (filter.legajo === "" || String(e.legajo).includes(filter.legajo)) &&
      (filter.nombre === "" ||
        `${e.nombre} ${e.apellido}`.toLowerCase().includes(filter.nombre.toLowerCase()))
  );

  // Opciones para selectores
  const categorias = [
    "ADMINISTRATIVO CAT 4 35 HS",
    "ADMINISTRATIVO CAT 5 35 HS",
    "ADMINISTRATIVO CAT 6 35 HS",
    "OBRERO CAT 5 40 HS",
    "OBRERO CAT 6 40 HS",
    "TECNICO CAT 7 35 HS",
    "TECNICO CAT 9 35 HS",
    "PROFESIONAL CAT 9 35 HS",
  ];

  const funciones = [
    "Administrativo",
    "Técnico",
    "Cajero",
    "Pintor",
    "Electricista",
    "Plomero",
    "Limpieza",
    "Sepulturero",
    "Docente",
    "Enfermero",
    "Analista Funcional",
    "Desarrollador de Software",
    "Soporte Técnico",
    "Oficial Albañil",
    "Ayudante Albañil",
    "Selección de Personal"
  ];

  const particiones = [
    { value: "municipal", label: "CARRERA MUNICIPAL" },
    { value: "docente", label: "CARRERA DOCENTE" },
    { value: "medico", label: "CARRERA MÉDICA" }
  ];

  const tiposCargo = [
    { value: "permanente", label: "Planta Permanente" },
    { value: "temporario", label: "Temporario" },
    { value: "contratado", label: "Contratado" },
    { value: "pasantia", label: "Pasantía" }
  ];

  const estados = [
    { value: "activo", label: "Activo" },
    { value: "inactivo", label: "Inactivo" },
    { value: "traspaso_pendiente", label: "Traspaso Pendiente" },
    { value: "traspaso_aprobado", label: "Traspaso Aprobado" }
  ];

  return (
    <div className="app-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Empleados</h1>
        <p className="text-gray-600">Administración del personal - Área {area}</p>
      </div>

      <div className="space-y-6">
        {/* Formulario */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? "✏️ Editar Empleado" : "👥 Agregar Nuevo Empleado"}
          </h3>
          
          <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Datos Personales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Legajo *</label>
              <input 
                className="input-modern" 
                placeholder="Número de legajo" 
                value={nuevo.legajo} 
                onChange={(e) => setNuevo({ ...nuevo, legajo: e.target.value })} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
              <input 
                className="input-modern" 
                placeholder="Nombre del empleado" 
                value={nuevo.nombre} 
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Apellido *</label>
              <input 
                className="input-modern" 
                placeholder="Apellido del empleado" 
                value={nuevo.apellido} 
                onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Documento</label>
              <input 
                className="input-modern" 
                placeholder="Número de documento" 
                value={nuevo.documento} 
                onChange={(e) => setNuevo({ ...nuevo, documento: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                className="input-modern" 
                type="email"
                placeholder="email@municipio.com" 
                value={nuevo.email} 
                onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input 
                className="input-modern" 
                placeholder="Teléfono de contacto" 
                value={nuevo.telefono} 
                onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} 
              />
            </div>

            {/* Datos Laborales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secretaría</label>
              <input 
                className="input-modern" 
                placeholder="Secretaría o departamento" 
                value={nuevo.secretaria} 
                onChange={(e) => setNuevo({ ...nuevo, secretaria: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horario</label>
              <input 
                className="input-modern" 
                placeholder="Horario de trabajo" 
                value={nuevo.horario} 
                onChange={(e) => setNuevo({ ...nuevo, horario: e.target.value })} 
              />
            </div>

            {/* Área */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Área *</label>
              <input
                className="input-modern"
                placeholder="Buscar área..."
                value={busquedaArea}
                onChange={(e) => handleBusquedaArea(e.target.value)}
                onFocus={() => setMostrarDropdown(true)}
                onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)}
                required={!nuevo.area}
              />
              {mostrarDropdown && areasFiltradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {areasFiltradas.map((area) => (
                    <button
                      key={area.id}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
                      onMouseDown={() => seleccionarArea(area)}
                    >
                      <div className="font-medium">{area.nombre}</div>
                      <div className="text-xs text-gray-500">{area.id}</div>
                    </button>
                  ))}
                </div>
              )}
              {nuevo.area && (
                <div className="mt-2 text-xs text-green-600">
                  ✅ {nuevo.area.nombre}
                </div>
              )}
            </div>

            {/* Categoría y Función */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                className="input-modern"
                value={nuevo.categoria}
                onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
              >
                <option value="">Seleccionar categoría...</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Función</label>
              <select
                className="input-modern"
                value={nuevo.funcion}
                onChange={(e) => setNuevo({ ...nuevo, funcion: e.target.value })}
              >
                <option value="">Seleccionar función...</option>
                {funciones.map(func => (
                  <option key={func} value={func}>{func}</option>
                ))}
              </select>
            </div>

            {/* Partición y Tipo de Cargo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partición</label>
              <select
                className="input-modern"
                value={nuevo.particion}
                onChange={(e) => setNuevo({ ...nuevo, particion: e.target.value })}
              >
                {particiones.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Cargo</label>
              <select
                className="input-modern"
                value={nuevo.tipoCargo}
                onChange={(e) => setNuevo({ ...nuevo, tipoCargo: e.target.value })}
              >
                {tiposCargo.map(tc => (
                  <option key={tc.value} value={tc.value}>{tc.label}</option>
                ))}
              </select>
            </div>

            {/* Fecha y Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Ingreso</label>
              <input 
                className="input-modern" 
                type="date"
                value={nuevo.fechaIngreso} 
                onChange={(e) => setNuevo({ ...nuevo, fechaIngreso: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                className="input-modern"
                value={nuevo.estado}
                onChange={(e) => setNuevo({ ...nuevo, estado: e.target.value })}
              >
                {estados.map(est => (
                  <option key={est.value} value={est.value}>{est.label}</option>
                ))}
              </select>
            </div>

            {/* Botones */}
            <div className="flex items-end gap-2 col-span-1 md:col-span-2 lg:col-span-3">
              <button type="submit" className="btn-primary flex-1">
                {editingId ? "💾 Guardar Cambios" : "➕ Crear Empleado"}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="btn-secondary px-4 py-2"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Empleados */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between mb-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por legajo</label>
                <input 
                  className="input-modern" 
                  placeholder="Número de legajo..." 
                  value={filter.legajo} 
                  onChange={(e) => setFilter({ ...filter, legajo: e.target.value })} 
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por nombre</label>
                <input 
                  className="input-modern" 
                  placeholder="Nombre o apellido..." 
                  value={filter.nombre} 
                  onChange={(e) => setFilter({ ...filter, nombre: e.target.value })} 
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filtered.length} de {empleados.length} empleados
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay empleados</h3>
              <p className="text-gray-600">
                {empleados.length === 0 
                  ? "No se han registrado empleados en esta área" 
                  : "No se encontraron empleados con los filtros aplicados"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 1100 }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Función</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {emp.nombre?.[0]}{emp.apellido?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {emp.nombre} {emp.apellido}
                            </div>
                            <div className="text-sm text-gray-500">Legajo: {emp.legajo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.area?.nombre || emp.lugarTrabajo || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.categoria || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.funcion || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emp.estado === 'activo' 
                            ? 'bg-green-100 text-green-800'
                            : emp.estado === 'inactivo'
                            ? 'bg-red-100 text-red-800'
                            : emp.estado === 'traspaso_pendiente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {emp.estado || "activo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditar(emp)} 
                            className="text-municipio-600 hover:text-municipio-700 bg-municipio-50 hover:bg-municipio-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            ✏️ Editar
                          </button>
                          <button 
                            onClick={() => handleEliminar(emp.id)} 
                            className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}