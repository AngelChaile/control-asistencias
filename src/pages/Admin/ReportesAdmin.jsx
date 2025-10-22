import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold">Reportes</h2>

        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <div>
            <label className="text-sm">Desde</label>
            <input className="block border rounded px-3 py-2" type="date" value={filters.desde} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} />
          </div>
          <div>
            <label className="text-sm">Hasta</label>
            <input className="block border rounded px-3 py-2" type="date" value={filters.hasta} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} />
          </div>
          <input className="border rounded px-3 py-2" placeholder="Legajo" value={filters.legajo} onChange={(e) => setFilters({ ...filters, legajo: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Nombre/Apellido" value={filters.nombre} onChange={(e) => setFilters({ ...filters, nombre: e.target.value })} />
          <button onClick={handleSearch} className="px-4 py-2 bg-municipio-500 text-white rounded">Buscar</button>
          <ExportExcel data={result} filename={`reporte_${user?.lugarTrabajo || "all"}.xlsx`} />
        </div>

        {loading ? <p className="text-gray-500 mt-4">Cargando...</p> : result.length === 0 ? <p className="text-gray-500 mt-4">No hay resultados.</p> : (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hora</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tipo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Área</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Justificado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {result.map((r) => (
                  <tr key={r.id || `${r.legajo}-${r.fecha}-${r.hora}`}>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.legajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.apellido}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.fecha}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.hora}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.tipo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.lugarTrabajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.justificado ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}