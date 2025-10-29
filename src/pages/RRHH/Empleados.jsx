import React, { useEffect, useState } from "react";
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "../../firebase";
import ExportExcel from "../../components/ExportExcel";
import { fetchEmpleadosPage, fetchAllEmpleados, fetchEmpleadosByLugarTrabajo } from "../../utils/usuarios";

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

  // paginación
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 200;

  useEffect(() => {
    // carga inicial: no trae todo a la vez, carga primera página
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFirstPage({ area = null } = {}) {
    setLoading(true);
    try {
      setLastDoc(null);
      setHasMore(true);
      const { rows, lastDoc: last } = await fetchEmpleadosPage({ lugar: area || null, pageSize: PAGE_SIZE, cursorDoc: null });
      setEmpleados(rows);
      setLastDoc(last);
      setHasMore(!!last);
    } catch (err) {
      console.error("fetchEmpleados paginado:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const { rows, lastDoc: last } = await fetchEmpleadosPage({ lugar: filter.area || null, pageSize: PAGE_SIZE, cursorDoc: lastDoc });
      setEmpleados((prev) => [...prev, ...rows]);
      setLastDoc(last);
      setHasMore(!!last);
    } catch (err) {
      console.error("loadMore empleados:", err);
    } finally {
      setLoading(false);
    }
  }

  // Buscar: si hay legajo hacemos consulta exacta al servidor (rápida)
  // si hay area hacemos paginado por area (resetea y carga desde servidor)
  // si sólo nombre -> se filtra client-side sobre las páginas ya cargadas
  async function handleSearch() {
    setLoading(true);
    try {
      // legajo exacto: servidor
      if (filter.legajo && filter.legajo.trim()) {
        const q = query(collection(db, "empleados"), where("legajo", "==", String(filter.legajo).trim()));
        const snap = await getDocs(q);
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEmpleados(rows);
        setLastDoc(null);
        setHasMore(false);
        return;
      }

      // filtrar por área: cargar primera página para esa área
      if (filter.area && filter.area.trim()) {
        await loadFirstPage({ area: filter.area.trim() });
        return;
      }

      // sin filtro legajo/area: cargar primera página general
      await loadFirstPage({ area: null });
    } catch (err) {
      console.error("handleSearch empleados:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFilter({ legajo: "", nombre: "", area: "" });
    loadFirstPage({ area: null });
  }

  // Guardar / editar / eliminar (sin cambios en lógica)
  async function handleGuardar(e) {
    e.preventDefault();
    try {
      const payload = { ...nuevo };
      if (editingId) {
        await updateDoc(doc(db, "empleados", editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "empleados"), payload);
      }
      setNuevo({ 
        legajo: "", 
        nombre: "", 
        apellido: "", 
        lugarTrabajo: "", 
        secretaria: "", 
        horario: "" 
      });
      // tras guardar recargar la primera página (mantener filtros de área si aplican)
      await loadFirstPage({ area: filter.area || null });
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
      // refrescar página actual
      await loadFirstPage({ area: filter.area || null });
    } catch (err) {
      console.error(err);
    }
  }

  // Filtrado por nombre se aplica client-side sobre las filas cargadas
  const filtered = empleados.filter(e =>
    (filter.legajo === "" || String(e.legajo).includes(filter.legajo)) &&
    (filter.nombre === "" || `${e.nombre} ${e.apellido}`.toLowerCase().includes(filter.nombre.toLowerCase())) &&
    (filter.area === "" || (e.lugarTrabajo || "").toLowerCase().includes(filter.area.toLowerCase()))
  );

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
            <div className="flex-1">
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
              <div className="flex items-end gap-2">
                <button onClick={handleSearch} className="btn-primary px-4 py-2">Buscar</button>
                <button onClick={handleReset} className="btn-secondary px-4 py-2" title="Limpiar filtros">🗑️</button>
              </div>
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
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 900 }}>
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

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {filtered.length} de {/* total known loaded */ empleados.length} empleados cargados
                </div>
                <div>
                  {hasMore ? (
                    <button onClick={loadMore} className="btn-secondary px-4 py-2">
                      Cargar más
                    </button>
                  ) : (
                    <button onClick={() => {/* opcional: cargar todo o indicar fin */}} className="btn-secondary px-4 py-2" disabled>
                      No hay más
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}