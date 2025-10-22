import React, { useEffect, useState } from "react";
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "../../firebase";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevo, setNuevo] = useState({ email: "", nombre: "", apellido: "", legajo: "", lugarTrabajo: "", contraseña: "", rol: "empleado" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  async function fetchUsuarios() {
    const snap = await getDocs(collection(db, "users"));
    setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function handleGuardar(e) {
    e.preventDefault();
    if (editingId) {
      await updateDoc(doc(db, "users", editingId), nuevo);
      setEditingId(null);
    } else {
      await addDoc(collection(db, "users"), nuevo);
    }
    setNuevo({ email: "", nombre: "", apellido: "", legajo: "", lugarTrabajo: "", contraseña: "", rol: "empleado" });
    fetchUsuarios();
  }

  async function handleEditar(u) {
    setEditingId(u.id);
    setNuevo(u);
  }

  async function handleEliminar(id) {
    if (window.confirm("¿Eliminar usuario?")) {
      await deleteDoc(doc(db, "users", id));
      fetchUsuarios();
    }
  }

  return (
    <div className="app-container">
      <div className="card">
        <h2 className="text-2xl font-semibold">Usuarios</h2>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rol</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-sm text-gray-800">{u.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{u.nombre}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{u.apellido}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{u.legajo}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{u.rol}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">
                    <button onClick={() => handleEditar(u)} className="mr-2 px-2 py-1 bg-municipio-100 text-municipio-700 rounded">✏️</button>
                    <button onClick={() => handleEliminar(u.id)} className="px-2 py-1 bg-red-600 text-white rounded">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-lg font-medium">{editingId ? "Editar" : "Nuevo"} usuario</h3>
        <form onSubmit={handleGuardar} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Email" value={nuevo.email} onChange={e => setNuevo({...nuevo, email: e.target.value})} required/>
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} required/>
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Apellido" value={nuevo.apellido} onChange={e => setNuevo({...nuevo, apellido: e.target.value})} required/>
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Legajo" value={nuevo.legajo} onChange={e => setNuevo({...nuevo, legajo: e.target.value})} required/>
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Lugar de trabajo" value={nuevo.lugarTrabajo} onChange={e => setNuevo({...nuevo, lugarTrabajo: e.target.value})} required/>
          <input className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" placeholder="Contraseña" value={nuevo.contraseña} onChange={e => setNuevo({...nuevo, contraseña: e.target.value})} required/>
          <select className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-municipio-300" value={nuevo.rol} onChange={e => setNuevo({...nuevo, rol: e.target.value})}>
            <option value="empleado">Empleado</option>
            <option value="admin">Admin</option>
            <option value="rrhh">RRHH</option>
          </select>
          <div className="flex items-center gap-2">
            <button type="submit" className="px-4 py-2 bg-municipio-500 text-white rounded-lg shadow">{editingId ? "Guardar cambios" : "Crear usuario"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
