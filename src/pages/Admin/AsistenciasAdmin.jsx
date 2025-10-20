import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportCSV from "../../components/ExportExcel";
import { fetchAsistenciasToday, fetchAsistenciasByFilters } from "../../utils/asistencia"; // adapta nombres

export default function AsistenciasAdmin() {
  const { user } = useAuth();
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({ legajo: "", nombre: "" });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // trae las asistencias del día, opcionalmente filtradas por área del admin
        const data = await fetchAsistenciasToday(user?.lugarTrabajo);
        setAsistencias(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function filtered() {
    return asistencias.filter((a) => {
      return (
        (query.legajo === "" || (a.legajo + "").includes(query.legajo)) &&
        (query.nombre === "" ||
          `${a.nombre} ${a.apellido}`.toLowerCase().includes(query.nombre.toLowerCase()))
      );
    });
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Asistencias - Hoy</h2>

      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="Legajo"
          value={query.legajo}
          onChange={(e) => setQuery({ ...query, legajo: e.target.value })}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="Nombre o apellido"
          value={query.nombre}
          onChange={(e) => setQuery({ ...query, nombre: e.target.value })}
        />
        <ExportCSV data={filtered()} filename={`asistencias_hoy_${user?.lugarTrabajo || "all"}.csv`} />
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : filtered().length === 0 ? (
        <p>No hay registros para hoy.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Área</th>
            </tr>
          </thead>
          <tbody>
            {filtered().map((a) => (
              <tr key={a.id || `${a.legajo}-${a.fecha}-${a.hora}`}>
                <td>{a.legajo}</td>
                <td>{a.nombre}</td>
                <td>{a.apellido}</td>
                <td>{a.tipo}</td>
                <td>{a.fecha}</td>
                <td>{a.hora}</td>
                <td>{a.lugarTrabajo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}