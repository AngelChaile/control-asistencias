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

export default function EmpleadosAdmin() {
  const { user } = useAuth();
  const area = user?.lugarTrabajo || "";
  const [empleados, setEmpleados] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "" });
  const [nuevo, setNuevo] = useState({
    legajo: "",
    nombre: "",
    apellido: "",
    lugarTrabajo: area,
    secretaria: "",
    horario: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const filtered = empleados.filter(
    (e) =>
      (filter.legajo === "" || String(e.legajo).includes(filter.legajo)) &&
      (filter.nombre === "" ||
        `${e.nombre} ${e.apellido}`.toLowerCase().includes(filter.nombre.toLowerCase()))
  );

  async function handleGuardar(e) {
    e.preventDefault();
    try {
      const payload = { ...nuevo, lugarTrabajo: area };
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
        lugarTrabajo: area,
        secretaria: "",
        horario: "",
      });
      fetchEmpleados();
    } catch (err) {
      console.error("guardar empleado admin:", err);
    }
  }

  function handleEditar(emp) {
    setEditingId(emp.id);
    setNuevo({
      legajo: emp.legajo || "",
      nombre: emp.nombre || "",
      apellido: emp.apellido || "",
      lugarTrabajo: emp.lugarTrabajo || area,
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
      console.error("eliminar empleado admin:", err);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Empleados - Área {area}</h2>

      <div>
        <input
          placeholder="Legajo"
          value={filter.legajo}
          onChange={(e) => setFilter({ ...filter, legajo: e.target.value })}
        />
        <input
          placeholder="Nombre"
          value={filter.nombre}
          onChange={(e) => setFilter({ ...filter, nombre: e.target.value })}
        />
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table
          border="1"
          cellPadding="6"
          style={{ marginTop: 12, width: "100%", borderCollapse: "collapse" }}
        >
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
            {filtered.map((emp) => (
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
      )}

      <h3 style={{ marginTop: 20 }}>{editingId ? "Editar" : "Nuevo"} empleado</h3>
      <form onSubmit={handleGuardar}>
        <input
          placeholder="Legajo"
          value={nuevo.legajo}
          onChange={(e) => setNuevo({ ...nuevo, legajo: e.target.value })}
          required
        />
        <input
          placeholder="Nombre"
          value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
          required
        />
        <input
          placeholder="Apellido"
          value={nuevo.apellido}
          onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })}
          required
        />
        <input
          placeholder="Secretaria"
          value={nuevo.secretaria}
          onChange={(e) => setNuevo({ ...nuevo, secretaria: e.target.value })}
        />
        <input
          placeholder="Horario"
          value={nuevo.horario}
          onChange={(e) => setNuevo({ ...nuevo, horario: e.target.value })}
        />
        <button type="submit">{editingId ? "Guardar cambios" : "Crear empleado"}</button>
      </form>
    </div>
  );
}