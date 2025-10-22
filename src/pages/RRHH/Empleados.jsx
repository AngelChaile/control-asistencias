import React, { useEffect, useState } from "react";
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "../../firebase";
import ExportExcel from "../../components/ExportExcel";

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "", area: "" });
  const [nuevo, setNuevo] = useState({ 
    legajo: "", 
    nombre: "", 
    apellido: "", 
    lugarTrabajo: "", 
    secretaria: "", 
    horario: "" 
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmpleados();
  }, []);

  async function fetchEmpleados() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "empleados"));
      setEmpleados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = empleados.filter(e =>
    (filter.legajo === "" || String(e.legajo).includes(filter.legajo)) &&
    (filter.nombre === "" || `${e.nombre} ${e.apellido}`.toLowerCase().includes(filter.nombre.toLowerCase())) &&
    (filter.area === "" || (e.lugarTrabajo || "").toLowerCase().includes(filter.area.toLowerCase()))
  );

  async function handleGuardar(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "empleados", editingId), nuevo);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "empleados"), nuevo);
      }
      setNuevo({ 
        legajo: "", 
        nombre: "", 
        apellido: "", 
        lugarTrabajo: "", 
        secretaria: "", 
        horario: "" 
      });
      fetchEmpleados();
    } catch (err) {
      console.error(err);
    }
  }

  function handleEditar(emp) {
    setEditingId(emp.id);
    setNuevo({
      legajo: emp.legajo || "",
      nombre: emp.nombre || "",
      apellido: emp.apellido || "",
      lugarTrabajo: emp.lugarTrabajo || "",
      secretaria: emp.secretaria || "",
      horario: emp.horario || "",
    });
  }

  async function handleEliminar(id) {
    if (!window.confirm("¿Estás seguro de eliminar este empleado?")) return;
    try {
      await deleteDoc(doc(db, "empleados", id));
      fetchEmpleados();
    } catch (err) {
      console.error(err);
    }
  }

  const handleReset = () => {
    setFilter({ legajo: "", nombre: "", area: "" });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Empleados</h1>
        <p className="text-gray-600">Administración completa del personal municipal</p>
      </div>

      <div className="space-y-6">
        {/* Formulario de Nuevo/Editar Empleado */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? "✏️ Editar Empleado" : "👥 Agregar Nuevo Empleado"}
          </h3>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Lugar de Trabajo</label>
              <input 
                className="input-modern" 
                placeholder="Área o departamento" 
                value={nuevo.lugarTrabajo} 
                onChange={(e) => setNuevo({ ...nuevo, lugarTrabajo: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secretaría</label>
              <input 
                className="input-modern" 
                placeholder="Secretaría o dirección" 
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
            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
              <button type="submit" className="btn-primary flex-1">
                {editingId ? "💾 Guardar Cambios" : "➕ Crear Empleado"}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => { 
                    setEditingId(null); 
                    setNuevo({ 
                      legajo: "", 
                      nombre: "", 
                      apellido: "", 
                      lugarTrabajo: "", 
                      secretaria: "", 
                      horario: "" 
                    }); 
                  }} 
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
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Lista de Empleados</h3>
              <p className="text-gray-600">Gestión completa del personal registrado</p>
            </div>
            <div className="flex gap-2">
              <ExportExcel data={filtered} filename="empleados_completo.xlsx">
                📊 Exportar
              </ExportExcel>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por legajo</label>
              <input 
                className="input-modern" 
                placeholder="Número de legajo..." 
                value={filter.legajo} 
                onChange={e => setFilter({ ...filter, legajo: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por nombre</label>
              <input 
                className="input-modern" 
                placeholder="Nombre o apellido..." 
                value={filter.nombre} 
                onChange={e => setFilter({ ...filter, nombre: e.target.value })} 
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por área</label>
                <input 
                  className="input-modern" 
                  placeholder="Área o departamento..." 
                  value={filter.area} 
                  onChange={e => setFilter({ ...filter, area: e.target.value })} 
                />
              </div>
              <button 
                onClick={handleReset} 
                className="btn-secondary self-end px-3 py-2"
                title="Limpiar filtros"
              >
                🗑️
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {empleados.length === 0 ? "No hay empleados" : "No se encontraron resultados"}
              </h3>
              <p className="text-gray-600">
                {empleados.length === 0 
                  ? "Comienza agregando el primer empleado al sistema" 
                  : "Intenta con otros términos de búsqueda"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secretaría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map(emp => (
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
                        {emp.lugarTrabajo || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {emp.secretaria || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {emp.horario || <span className="text-gray-400">—</span>}
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

          {/* Contador de resultados */}
          {!loading && filtered.length > 0 && (
            <div className="text-sm text-gray-600 mt-4">
              Mostrando {filtered.length} de {empleados.length} empleados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}