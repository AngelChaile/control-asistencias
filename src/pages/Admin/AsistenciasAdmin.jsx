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
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold">Asistencias - Hoy</h2>

        <div className="flex gap-3 my-4 items-center">
          <input className="border rounded px-3 py-2" placeholder="Legajo" value={query.legajo} onChange={(e) => setQuery({ ...query, legajo: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Nombre o apellido" value={query.nombre} onChange={(e) => setQuery({ ...query, nombre: e.target.value })} />
          <ExportCSV data={filtered()} filename={`asistencias_hoy_${user?.lugarTrabajo || "all"}.csv`} />
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : filtered().length === 0 ? (
          <p className="text-gray-500">No hay registros para hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tipo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hora</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Área</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered().map((a) => (
                  <tr key={a.id || `${a.legajo}-${a.fecha}-${a.hora}`}>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.legajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.apellido}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.tipo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.fecha}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.hora}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{a.lugarTrabajo}</td>
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