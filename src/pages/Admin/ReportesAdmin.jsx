import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportCSV from "../../components/ExportCSV";
import { fetchAsistenciasByRange } from "../../utils/asistencia"; // adapta

export default function ReportesAdmin() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    desde: "",
    hasta: "",
    legajo: "",
    nombre: "",
  });
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    try {
      const desde = filters.desde ? new Date(filters.desde) : null;
      const hasta = filters.hasta ? new Date(filters.hasta) : null;
      // si es admin limitar por área, si rrhh pasar null para todas las áreas
      const areaFilter = user?.rol === "admin" ? user?.lugarTrabajo : null;
      const data = await fetchAsistenciasByRange({ desde, hasta, legajo: filters.legajo, nombre: filters.nombre, area: areaFilter });
      setResult(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Reportes</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Desde: <input type="date" value={filters.desde} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} /></label>
        <label style={{ marginLeft: 8 }}>Hasta: <input type="date" value={filters.hasta} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} /></label>
        <input placeholder="Legajo" value={filters.legajo} onChange={(e) => setFilters({ ...filters, legajo: e.target.value })} style={{ marginLeft: 8 }} />
        <input placeholder="Nombre/Apellido" value={filters.nombre} onChange={(e) => setFilters({ ...filters, nombre: e.target.value })} style={{ marginLeft: 8 }} />
        <button onClick={handleSearch} style={{ marginLeft: 8 }}>Buscar</button>
        <ExportCSV data={result} filename={`reportes_${user?.lugarTrabajo || "all"}.csv`} />
      </div>

      {loading ? <p>Cargando...</p> : result.length === 0 ? <p>No hay resultados.</p> : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Área</th>
              <th>Justificado</th>
            </tr>
          </thead>
          <tbody>
            {result.map((r) => (
              <tr key={r.id || `${r.legajo}-${r.fecha}-${r.hora}`}>
                <td>{r.legajo}</td>
                <td>{r.nombre}</td>
                <td>{r.apellido}</td>
                <td>{r.fecha}</td>
                <td>{r.hora}</td>
                <td>{r.tipo}</td>
                <td>{r.lugarTrabajo}</td>
                <td>{r.justificado ? "Sí" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}