import React, { useEffect, useState } from "react";
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "../../firebase";

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "", area: "" });
  const [nuevo, setNuevo] = useState({ legajo: "", nombre: "", apellido: "", lugarTrabajo: "", secretaria: "", horario: "" });
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
      setNuevo({ legajo: "", nombre: "", apellido: "", lugarTrabajo: "", secretaria: "", horario: "" });
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
    if (!window.confirm("¿Eliminar empleado?")) return;
    try {
      await deleteDoc(doc(db, "empleados", id));
      fetchEmpleados();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="app-container">
      <div className="card">
        <h2 className="text-2xl font-semibold">Empleados</h2>

        <div className="flex gap-3 mt-4">
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Legajo" value={filter.legajo} onChange={e => setFilter({ ...filter, legajo: e.target.value })} />
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Nombre" value={filter.nombre} onChange={e => setFilter({ ...filter, nombre: e.target.value })} />
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Área" value={filter.area} onChange={e => setFilter({ ...filter, area: e.target.value })} />
        </div>

        {loading ? (
          <p className="text-gray-500 mt-4">Cargando...</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Lugar</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Secretaria</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Horario</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td className="px-4 py-2 text-sm text-gray-800">{emp.legajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{emp.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{emp.apellido}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{emp.lugarTrabajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{emp.secretaria}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{emp.horario}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">
                      <button onClick={() => handleEditar(emp)} className="mr-2 px-2 py-1 bg-municipio-100 text-municipio-700 rounded">✏️</button>
                      <button onClick={() => handleEliminar(emp.id)} className="px-2 py-1 bg-red-600 text-white rounded">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mt-6 text-lg font-medium">{editingId ? "Editar" : "Nuevo"} empleado</h3>
        <form onSubmit={handleGuardar} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Legajo" value={nuevo.legajo} onChange={e => setNuevo({ ...nuevo, legajo: e.target.value })} required />
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} required />
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Apellido" value={nuevo.apellido} onChange={e => setNuevo({ ...nuevo, apellido: e.target.value })} required />
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Lugar" value={nuevo.lugarTrabajo} onChange={e => setNuevo({ ...nuevo, lugarTrabajo: e.target.value })} />
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Secretaria" value={nuevo.secretaria} onChange={e => setNuevo({ ...nuevo, secretaria: e.target.value })} />
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Horario" value={nuevo.horario} onChange={e => setNuevo({ ...nuevo, horario: e.target.value })} />
          <div className="flex items-center gap-2">
            <button type="submit" className="px-4 py-2 bg-municipio-500 text-white rounded-lg shadow">{editingId ? "Guardar cambios" : "Crear empleado"}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setNuevo({ legajo: "", nombre: "", apellido: "", lugarTrabajo: "", secretaria: "", horario: "" }); }} className="px-3 py-2 border rounded-lg">Cancelar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
