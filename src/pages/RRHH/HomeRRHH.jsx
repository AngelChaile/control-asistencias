import React, { useEffect, useState } from "react";
import { fetchAsistenciasToday } from "../../utils/asistencia";

export default function HomeRRHH() {
  const [asistencias, setAsistencias] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "", lugarTrabajo: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchAsistenciasToday();
        setAsistencias(rows || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = asistencias.filter((a) => {
    return (
      (filter.legajo === "" || String(a.legajo).includes(filter.legajo)) &&
      (filter.nombre === "" || `${a.nombre || ""} ${a.apellido || ""}`.toLowerCase().includes(filter.nombre.toLowerCase())) &&
      (filter.lugarTrabajo === "" || (a.lugarTrabajo || "").toLowerCase().includes(filter.lugarTrabajo.toLowerCase()))
    );
  });

  return (
    <div className="app-container max-w-6xl mx-auto p-6">
      <div className="hero mb-4">
        <h2 className="text-2xl font-semibold">Panel RRHH</h2>
        <p className="muted mt-1">Administración de personal y ausencias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="card">Empleados</div>
        <div className="card">Ausencias</div>
        <div className="card">Reportes</div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Asistencias del día</h3>

        <div className="flex gap-3 mt-3">
          <input className="input-base" placeholder="Legajo" value={filter.legajo} onChange={(e) => setFilter({ ...filter, legajo: e.target.value })} />
          <input className="input-base" placeholder="Nombre" value={filter.nombre} onChange={(e) => setFilter({ ...filter, nombre: e.target.value })} />
          <input className="input-base" placeholder="Lugar de Trabajo" value={filter.lugarTrabajo} onChange={(e) => setFilter({ ...filter, lugarTrabajo: e.target.value })} />
        </div>

        <div className="overflow-x-auto mt-4">
          {loading ? (
            <p className="muted">Cargando...</p>
          ) : filtered.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200" aria-label="Asistencias del día">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Área</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hora</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tipo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.legajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.apellido}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.lugarTrabajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.hora}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.fecha}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.tipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No hay registros para mostrar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
