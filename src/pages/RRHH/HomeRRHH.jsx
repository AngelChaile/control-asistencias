import React, { useEffect, useState } from "react";
import { db, collection, getDocs, query, orderBy } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar";

export default function HomeRRHH() {
  const { user } = useAuth(); // OK, solo una vez

  const [asistencias, setAsistencias] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "", area: "" });

  useEffect(() => {
    fetchAsistencias();
  }, []);

  async function fetchAsistencias() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const snap = await getDocs(query(collection(db, "asistencias"), orderBy("createdAt", "desc")));
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => {
      const created = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt.seconds * 1000);
      return created >= today;
    });
    setAsistencias(lista);
  }

  const filtered = asistencias.filter(a =>
    (filter.legajo === "" || a.legajo.includes(filter.legajo)) &&
    (filter.nombre === "" || a.nombre.toLowerCase().includes(filter.nombre.toLowerCase())) &&
    (filter.area === "" || (a.area || "").toLowerCase().includes(filter.area.toLowerCase()))
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Asistencias del día</h2>
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
            <th>Área</th>
            <th>Hora</th>
            <th>Fecha</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(a => (
            <tr key={a.id}>
              <td>{a.legajo}</td>
              <td>{a.nombre}</td>
              <td>{a.apellido}</td>
              <td>{a.lugarTrabajo}</td>
              <td>{a.fecha}</td>
              <td>{a.hora}</td>
              <td>{a.tipo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
