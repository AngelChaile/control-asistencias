import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
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

  // si quieres precargar área del usuario si tiene (opcional)
/*   useEffect(() => {
    if (user?.lugarTrabajo) setArea(user.lugarTrabajo);
  }, [user]); */

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold">Ausencias</h2>

        <div className="flex flex-wrap gap-3 mt-4 items-end">
          <div>
            <label className="text-sm">Área</label>
            <input className="border rounded px-3 py-2 block" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Dejar vacío para ver todas" />
          </div>
          <div>
            <label className="text-sm">Desde</label>
            <input className="border rounded px-3 py-2 block" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Hasta</label>
            <input className="border rounded px-3 py-2 block" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearch} className="px-4 py-2 bg-municipio-500 text-white rounded">Buscar</button>
            <ExportExcel data={result} filename={`ausencias_rrhh_${area || "all"}.xlsx`} />
          </div>
        </div>

        {loading ? <p className="text-gray-500 mt-4">Cargando...</p> : result.length === 0 ? <p className="text-gray-500 mt-4">No hay ausencias.</p> : (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Área</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Justificado</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Observaciones</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {result.map((r) => (
                  <tr key={r.id || `${r.legajo}-${r.fecha}`}>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.legajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.nombre} {r.apellido}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.lugarTrabajo}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.justificado ? "Sí" : "No"}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.justificativo || ""}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{r.fecha}</td>
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
