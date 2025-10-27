import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
import { fetchAusenciasByRange } from "../../utils/asistencia";
import { formatRRHHAusencias } from "../../utils/excelFormats";

// helper: parsear "yyyy-mm-dd" a Date local (sin shift UTC)
function parseInputDateToLocal(isoYmd) {
  if (!isoYmd) return null;
  const [y, m, d] = String(isoYmd).split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export default function AusenciasRRHH() {
  const { user } = useAuth();
  const [area, setArea] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    try {
      // convertir strings YYYY-MM-DD a Date local (evita restar un día)
      const desdeD = desde ? parseInputDateToLocal(desde) : null;
      const hastaD = hasta ? parseInputDateToLocal(hasta) : null;

      const data = await fetchAusenciasByRange({ desde: desdeD, hasta: hastaD, area: area || null });
      setResult(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleReset = () => {
    setArea("");
    setDesde("");
    setHasta("");
    setResult([]);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Ausencias</h1>
        <p className="text-gray-600">Consulta y control de faltas justificadas e injustificadas</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Filtros de Búsqueda */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Área específica</label>
            <input 
              className="input-modern" 
              value={area} 
              onChange={(e) => setArea(e.target.value)} 
              placeholder="Dejar vacío para todas" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha desde</label>
            <input 
              className="input-modern" 
              type="date" 
              value={desde} 
              onChange={(e) => setDesde(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha hasta</label>
            <input 
              className="input-modern" 
              type="date" 
              value={hasta} 
              onChange={(e) => setHasta(e.target.value)} 
            />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleSearch} className="btn-primary flex-1">
              🔍 Buscar
            </button>
            <button onClick={handleReset} className="btn-secondary px-4 py-2">
              🗑️
            </button>
          </div>
        </div>

        {/* Controles de Exportación */}
        {result.length > 0 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {result.length} ausencias encontradas
            </div>
            <ExportExcel 
              data={formatRRHHAusencias(result)} 
              filename={`ausencias_rrhh_${area || "all"}_${desde || ""}_${hasta || ""}.xlsx`}
            >
              📊 Exportar Excel
            </ExportExcel>
          </div>
        )}

        {/* Resultados */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
          </div>
        ) : result.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {desde || hasta || area ? "No se encontraron ausencias" : "Consulta de Ausencias"}
            </h3>
            <p className="text-gray-600">
              {desde || hasta || area 
                ? "No hay registros que coincidan con los filtros aplicados"
                : "Utiliza los filtros para buscar ausencias en un período específico"
              }
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Justificación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.map((r) => (
                  <tr key={r.id || `${r.legajo}-${r.fecha}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 font-medium text-sm">
                            {r.nombre?.[0]}{r.apellido?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {r.nombre} {r.apellido}
                          </div>
                          <div className="text-sm text-gray-500">Legajo: {r.legajo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r.lugarTrabajo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.justificado 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {r.justificado ? 'Justificado' : 'Sin justificar'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      {r.justificativo || (
                        <span className="text-gray-400 italic">Sin justificación registrada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r.fecha}
                    </td>
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