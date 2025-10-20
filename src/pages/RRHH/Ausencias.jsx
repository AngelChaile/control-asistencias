import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportCSV from "../../components/ExportCSV";
import { fetchAusenciasByRange, fetchAusenciasByArea } from "../../utils/asistencia"; // adapta

export default function AusenciasRRHH() {
  const { user } = useAuth();
  const [area, setArea] = useState(""); // seleccionar área (RRHH puede ver todas)
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    try {
      const desdeD = desde ? new Date(desde) : null;
      const hastaD = hasta ? new Date(hasta) : null;
      const data = await fetchAusenciasByRange({ desde: desdeD, hasta: hastaD, area: area || null });
      setResult(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // si quieres precargar área del usuario si tiene (opcional)
    if (user?.lugarTrabajo) setArea(user.lugarTrabajo);
  }, [user]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Ausencias (RRHH)</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Área: <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Dejar vacío para todas" /></label>
        <label style={{ marginLeft: 8 }}>Desde: <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label style={{ marginLeft: 8 }}>Hasta: <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
        <button onClick={handleSearch} style={{ marginLeft: 8 }}>Buscar</button>
        <ExportCSV data={result} filename={`ausencias_rrhh_${area || "all"}.csv`} />
      </div>

      {loading ? <p>Cargando...</p> : result.length === 0 ? <p>No hay ausencias.</p> : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Legajo</th>
              <th>Nombre</th>
              <th>Área</th>
              <th>Justificado</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {result.map((r) => (
              <tr key={r.id || `${r.legajo}-${r.fecha}`}>
                <td>{r.fecha}</td>
                <td>{r.legajo}</td>
                <td>{r.nombre} {r.apellido}</td>
                <td>{r.lugarTrabajo}</td>
                <td>{r.justificado ? "Sí" : "No"}</td>
                <td>{r.justificativo || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
