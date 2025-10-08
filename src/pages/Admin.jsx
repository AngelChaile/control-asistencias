import React, { useEffect, useState } from "react";
import QrGenerator from "../components/QrGenerator";
import EmployeeList from "../components/EmployeeList";
import { db, collection, addDoc, getDocs, query, where, setDoc, doc, deleteDoc } from "../firebase";
import { exportToCsv } from "../components/ExportCSV";

export default function Admin({ user }) {
  const [area, setArea] = useState(user?.area || "RRHH");
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchEmpleados() {
    setLoading(true);
    try {
      const q = query(collection(db, "empleados"), where("area", "==", area));
      const snap = await getDocs(q);
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmpleados(arr);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (area) fetchEmpleados();
  }, [area]);

  async function addEmpleado() {
    const legajo = prompt("Legajo");
    const nombre = prompt("Nombre");
    const apellido = prompt("Apellido");
    if (!legajo || !nombre) return alert("Datos incompletos");

    await addDoc(collection(db, "empleados"), { legajo, nombre, apellido, area, horario: "" });
    fetchEmpleados();
  }

  async function onDelete(e) {
    if (!confirm("Eliminar empleado?")) return;
    await deleteDoc(doc(db, "empleados", e.id));
    fetchEmpleados();
  }

  function exportDay() {
    const rows = empleados.map(emp => ({
      legajo: emp.legajo,
      nombre: emp.nombre,
      apellido: emp.apellido
    }));
    exportToCsv(`empleados_${area}.csv`, rows);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Panel Admin - Área: {area}</h2>
      <div>
        <label>Área: </label>
        <select value={area} onChange={e => setArea(e.target.value)}>
          <option>RRHH</option>
          <option>Sistemas</option>
          <option>Edilicio</option>
          <option>Administración</option>
        </select>
      </div>

      <QrGenerator area={area} />

      <div style={{ marginTop: 20 }}>
        <button onClick={addEmpleado}>Agregar empleado</button>
        <button onClick={fetchEmpleados} disabled={loading}>{loading ? "Cargando..." : "Refrescar"}</button>
        <button onClick={exportDay}>Exportar lista empleados</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <EmployeeList empleados={empleados} onEdit={() => {}} onDelete={onDelete} />
      </div>
    </div>
  );
}
