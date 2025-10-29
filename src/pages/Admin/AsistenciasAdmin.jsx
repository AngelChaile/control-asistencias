import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
import { formatAdminAsistencias } from "../../utils/excelFormats";
import { fetchAsistenciasToday, fetchAsistenciasByFilters } from "../../utils/asistencia";

export default function AsistenciasAdmin() {
  const { user } = useAuth();
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({ legajo: "", nombre: "" });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
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
    <div className="app-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Asistencias</h1>
        <p className="text-gray-600">Registros del día - Área {user?.lugarTrabajo}</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Filtros y Controles */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por legajo</label>
              <input 
                className="input-modern" 
                placeholder="Número de legajo..." 
                value={query.legajo} 
                onChange={(e) => setQuery({ ...query, legajo: e.target.value })} 
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por nombre</label>
              <input 
                className="input-modern" 
                placeholder="Nombre o apellido..." 
                value={query.nombre} 
                onChange={(e) => setQuery({ ...query, nombre: e.target.value })} 
              />
            </div>
          </div>
          <ExportExcel 
            data={formatAdminAsistencias(asistencias)} 
            filename={`asistencias_${user?.lugarTrabajo}_${new Date().toISOString().slice(0, 10)}.xlsx`}
          >
            📊 Exportar Excel
          </ExportExcel>
        </div>

        {/* Tabla de resultados */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
          </div>
        ) : filtered().length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros</h3>
            <p className="text-gray-600">No se encontraron asistencias para hoy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 900 }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered().map((a) => (
                  <tr key={a.id || `${a.legajo}-${a.fecha}-${a.hora}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">
                            {a.nombre?.[0]}{a.apellido?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {a.nombre} {a.apellido}
                          </div>
                          <div className="text-sm text-gray-500">Legajo: {a.legajo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        a.tipo === 'ENTRADA' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {a.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {a.fecha}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {a.hora}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {a.lugarTrabajo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Contador de resultados */}
        {!loading && filtered().length > 0 && (
          <div className="text-sm text-gray-600">
            Mostrando {filtered().length} de {asistencias.length} registros
          </div>
        )}
      </div>
    </div>
  );
}