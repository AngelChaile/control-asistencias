import React, { useEffect, useState } from "react";
import { db, collection, getDocs, query, where, orderBy } from "../firebase";
import { exportToCsv } from "../components/ExportCSV";

export default function HR() {
  const [asistencias, setAsistencias] = useState([]);

  async function fetchAsistencias() {
    const q = query(collection(db, "asistencias"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    setAsistencias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => {
    fetchAsistencias();
  }, []);

  function exportAll() {
    exportToCsv("asistencias.csv", asistencias);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Recursos Humanos - Registro de Asistencias</h2>
      <button onClick={fetchAsistencias}>Refrescar</button>
      <button onClick={exportAll}>Exportar CSV</button>
      <table style={{ width: "100%", marginTop: 12 }}>
        <thead>
          <tr><th>Fecha</th><th>Hora</th><th>Legajo</th><th>Nombre</th><th>Tipo</th><th>Area</th></tr>
        </thead>
        <tbody>
          {asistencias.map(a => (
            <tr key={a.id}>
              <td>{a.fecha}</td><td>{a.hora}</td><td>{a.legajo}</td><td>{a.nombre} {a.apellido}</td><td>{a.tipo}</td><td>{a.area}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
