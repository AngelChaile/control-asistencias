import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
import { fetchAsistenciasByRange } from "../../utils/asistencia";
import { formatAdminAsistencias, formatRRHHAsistencias } from "../../utils/excelFormats";

export default function ReportesAdmin() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    desde: "",
    hasta: "",
    legajo: "",
    nombre: "",
    area: "", // nuevo: filtro por area para RRHH
  });
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    try {
      const desde = filters.desde ? new Date(filters.desde) : null;
      const hasta = filters.hasta ? new Date(filters.hasta) : null;
      // admin fija su área; rrhh usa el filtro elegido (o null para todas)
      const areaFilter = user?.rol === "admin" ? user?.lugarTrabajo : (filters.area ? filters.area : null);
      const data = await fetchAsistenciasByRange({
        desde,
        hasta,
        legajo: filters.legajo,
        nombre: filters.nombre,
        area: areaFilter,
      });
      setResult(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleReset = () => {
    setFilters({
      desde: "",
      hasta: "",
      legajo: "",
      nombre: "",
      area: "", // nuevo: reiniciar filtro de área
    });
    setResult([]);
  };

  const exportData = user?.rol === "rrhh" ? formatRRHHAsistencias(result) : formatAdminAsistencias(result);
  const filename = user?.rol === "rrhh"
    ? `asistencias_admin_${user?.lugarTrabajo || "all"}_${filters.desde || "inicio"}_al_${filters.hasta || "fin"}.xlsx`
    : `asistencias_admin_${user?.lugarTrabajo || "all"}_${filters.desde || "inicio"}_al_${filters.hasta || "fin"}.xlsx`;

  return (
    <div className="app-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes y Consultas</h1>
        <p className="text-gray-600">Genera reportes personalizados de asistencias</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Filtros de Búsqueda */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha desde</label>
            <input 
              className="input-modern" 
              type="date" 
              value={filters.desde} 
              onChange={(e) => setFilters({ ...filters, desde: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha hasta</label>
            <input 
              className="input-modern" 
              type="date" 
              value={filters.hasta} 
              onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Legajo</label>
            <input 
              className="input-modern" 
              placeholder="Filtrar por legajo..." 
              value={filters.legajo} 
              onChange={(e) => setFilters({ ...filters, legajo: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre/Apellido</label>
            <input 
              className="input-modern" 
              placeholder="Filtrar por nombre..." 
              value={filters.nombre} 
              onChange={(e) => setFilters({ ...filters, nombre: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Área</label>
            <input
              className="input-modern"
              value={filters.area}
              onChange={(e) => setFilters((s) => ({ ...s, area: e.target.value }))}
              placeholder={user?.rol === "admin" ? (user?.lugarTrabajo || "") : "Filtrar por área (RRHH) — dejar vacío = todas"}
            />
          </div>
        </div>

        {/* Controles de Acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex gap-3">
            <button onClick={handleSearch} className="btn-primary">
              🔍 Generar Reporte
            </button>
            <button onClick={handleReset} className="btn-secondary">
              🗑️ Limpiar Filtros
            </button>
          </div>
          
          {result.length > 0 && (
            <ExportExcel data={exportData} filename={filename}>
              📊 Exportar Excel
            </ExportExcel>
          )}
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
          </div>
        ) : result.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📈</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin resultados</h3>
            <p className="text-gray-600">
              {filters.desde || filters.hasta || filters.legajo || filters.nombre
                ? "No se encontraron registros con los filtros aplicados"
                : "Utiliza los filtros para generar un reporte personalizado"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen del Reporte */}
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{result.length}</div>
                <div className="text-sm text-gray-600">Total registros</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.filter(r => r.tipo === 'ENTRADA').length}
                </div>
                <div className="text-sm text-gray-600">Entradas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.filter(r => r.tipo === 'SALIDA').length}
                </div>
                <div className="text-sm text-gray-600">Salidas</div>
              </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.map((r) => (
                    <tr key={r.id || `${r.legajo}-${r.fecha}-${r.hora}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-sm">
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
                        {r.fecha}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.hora}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.tipo === 'ENTRADA' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {r.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.lugarTrabajo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.justificado 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {r.justificado ? 'Justificado' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pie del Reporte */}
            <div className="text-sm text-gray-600 text-center">
              Reporte generado el {new Date().toLocaleDateString('es-AR')} • 
              Mostrando {result.length} registros
            </div>
          </div>
        )}
      </div>
    </div>
  );
}