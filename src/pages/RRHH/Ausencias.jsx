import React, { useEffect, useState } from "react";
import { db, collection, getDocs, query, where, updateDoc, doc, orderBy } from "../../firebase";

export default function Ausencias() {
  const [ausencias, setAusencias] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "", area: "", fechaDesde: "", fechaHasta: "" });

  useEffect(() => {
    fetchAusencias();
  }, []);

  async function fetchAusencias() {
    try {
      const q = query(collection(db, "ausencias"), orderBy("fecha", "desc"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAusencias(lista);
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = ausencias.filter(a =>
    (filter.legajo === "" || a.legajo.includes(filter.legajo)) &&
    (filter.nombre === "" || a.nombre.toLowerCase().includes(filter.nombre.toLowerCase())) &&
    (filter.area === "" || (a.area || "").toLowerCase().includes(filter.area.toLowerCase())) &&
    (!filter.fechaDesde || new Date(a.fecha) >= new Date(filter.fechaDesde)) &&
    (!filter.fechaHasta || new Date(a.fecha) <= new Date(filter.fechaHasta))
  );

  async function marcarJustificativo(id) {
    await updateDoc(doc(db, "ausencias", id), { justificativo: true });
    fetchAusencias();
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Ausencias</h2>
      <div>
        <input placeholder="Legajo" value={filter.legajo} onChange={e => setFilter({...filter, legajo: e.target.value})} />
        <input placeholder="Nombre" value={filter.nombre} onChange={e => setFilter({...filter, nombre: e.target.value})} />
        <input placeholder="Área" value={filter.area} onChange={e => setFilter({...filter, area: e.target.value})} />
        <input type="date" placeholder="Desde" value={filter.fechaDesde} onChange={e => setFilter({...filter, fechaDesde: e.target.value})} />
        <input type="date" placeholder="Hasta" value={filter.fechaHasta} onChange={e => setFilter({...filter, fechaHasta: e.target.value})} />
        <button onClick={fetchAusencias}>🔄 Refrescar</button>
      </div>

      <table border="1" cellPadding="6" style={{ marginTop: 12, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Legajo</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Fecha</th>
            <th>Justificativo</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(a => (
            <tr key={a.id}>
              <td>{a.legajo}</td>
              <td>{a.nombre}</td>
              <td>{a.apellido}</td>
              <td>{a.fecha}</td>
              <td>{a.justificativo ? "✅" : "❌"}</td>
              <td>
                {!a.justificativo && <button onClick={() => marcarJustificativo(a.id)}>Marcar Justificativo</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
