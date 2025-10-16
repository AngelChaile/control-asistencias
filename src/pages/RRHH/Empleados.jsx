import React, { useEffect, useState } from "react";
import { db, collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc } from "../../firebase";

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "", area: "" });
  const [nuevo, setNuevo] = useState({ legajo: "", nombre: "", apellido: "", lugarTrabajo: "", secretaria: "", horario: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchEmpleados();
  }, []);

  async function fetchEmpleados() {
    try {
      const snap = await getDocs(collection(db, "empleados"));
      setEmpleados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = empleados.filter(e =>
    (filter.legajo === "" || e.legajo.includes(filter.legajo)) &&
    (filter.nombre === "" || e.nombre.toLowerCase().includes(filter.nombre.toLowerCase())) &&
    (filter.area === "" || (e.area || "").toLowerCase().includes(filter.area.toLowerCase()))
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

  async function handleEditar(emp) {
    setEditingId(emp.id);
    setNuevo(emp);
  }

  async function handleEliminar(id) {
    if (window.confirm("¿Eliminar empleado?")) {
      await deleteDoc(doc(db, "empleados", id));
      fetchEmpleados();
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Empleados</h2>
      <div>
        <input placeholder="Legajo" value={filter.legajo} onChange={e => setFilter({...filter, legajo: e.target.value})} />
        <input placeholder="Nombre" value={filter.nombre} onChange={e => setFilter({...filter, nombre: e.target.value})} />
        <input placeholder="Área" value={filter.area} onChange={e => setFilter({...filter, area: e.target.value})} />
      </div>

      <table border="1" cellPadding="6" style={{ marginTop: 12, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Legajo</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Lugar</th>
            <th>Secretaria</th>
            <th>Horario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(emp => (
            <tr key={emp.id}>
              <td>{emp.legajo}</td>
              <td>{emp.nombre}</td>
              <td>{emp.apellido}</td>
              <td>{emp.lugarTrabajo}</td>
              <td>{emp.secretaria}</td>
              <td>{emp.horario}</td>
              <td>
                <button onClick={() => handleEditar(emp)}>✏️</button>
                <button onClick={() => handleEliminar(emp.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 20 }}>{editingId ? "Editar" : "Nuevo"} empleado</h3>
      <form onSubmit={handleGuardar}>
        <input placeholder="Legajo" value={nuevo.legajo} onChange={e => setNuevo({...nuevo, legajo: e.target.value})} required/>
        <input placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} required/>
        <input placeholder="Apellido" value={nuevo.apellido} onChange={e => setNuevo({...nuevo, apellido: e.target.value})} required/>
        <input placeholder="Lugar" value={nuevo.lugarTrabajo} onChange={e => setNuevo({...nuevo, lugarTrabajo: e.target.value})} />
        <input placeholder="Secretaria" value={nuevo.secretaria} onChange={e => setNuevo({...nuevo, secretaria: e.target.value})} />
        <input placeholder="Horario" value={nuevo.horario} onChange={e => setNuevo({...nuevo, horario: e.target.value})} />
        <button type="submit">{editingId ? "Guardar cambios" : "Crear empleado"}</button>
      </form>
    </div>
  );
}
