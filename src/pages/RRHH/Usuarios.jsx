import React, { useEffect, useState } from "react";
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "../../firebase";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevo, setNuevo] = useState({ email: "", nombre: "", rol: "empleado" });
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
    setNuevo({ email: "", nombre: "", rol: "empleado" });
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
    <div style={{ padding: 20 }}>
      <h2>Usuarios</h2>
      <table border="1" cellPadding="6" style={{ marginTop: 12, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.nombre}</td>
              <td>{u.rol}</td>
              <td>
                <button onClick={() => handleEditar(u)}>✏️</button>
                <button onClick={() => handleEliminar(u.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 20 }}>{editingId ? "Editar" : "Nuevo"} usuario</h3>
      <form onSubmit={handleGuardar}>
        <input placeholder="Email" value={nuevo.email} onChange={e => setNuevo({...nuevo, email: e.target.value})} required/>
        <input placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} required/>
        <select value={nuevo.rol} onChange={e => setNuevo({...nuevo, rol: e.target.value})}>
          <option value="empleado">Empleado</option>
          <option value="admin">Admin</option>
          <option value="rrhh">RRHH</option>
        </select>
        <button type="submit">{editingId ? "Guardar cambios" : "Crear usuario"}</button>
      </form>
    </div>
  );
}
