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

  // Función para normalizar filtros (trim + preparar para búsqueda)
  const normalizeFilters = (filters) => {
    return {
      ...filters,
      legajo: filters.legajo.trim(),
      nombre: filters.nombre.trim(),
      area: filters.area.trim()
    };
  };

async function handleSearch() {
  setLoading(true);
  try {
    const desde = filters.desde ? new Date(filters.desde) : null;
    const hasta = filters.hasta ? new Date(filters.hasta) : null;
    
    // Normalizar filtros antes de enviar
    const normalizedFilters = normalizeFilters(filters);
    
    // Para admin: usar su área automáticamente (sin filtro en el input)
    // Para RRHH: enviar el área del filtro (puede estar vacío para todas)
    const areaFilter = user?.rol === "admin" ? user?.lugarTrabajo : normalizedFilters.area;
    
    const data = await fetchAsistenciasByRange({
      desde,
      hasta,
      legajo: normalizedFilters.legajo,
      nombre: normalizedFilters.nombre,
      area: areaFilter, // Ahora se filtra case-insensitive en el cliente
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

  // Función para manejar cambios en inputs con trim automático
  const handleInputChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
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
        <div className={`grid grid-cols-1 gap-4 ${user?.rol === "rrhh" ? "md:grid-cols-2 lg:grid-cols-5" : "md:grid-cols-2 lg:grid-cols-4"}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha desde</label>
            <input 
              className="input-modern" 
              type="date" 
              value={filters.desde} 
              onChange={(e) => handleInputChange('desde', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha hasta</label>
            <input 
              className="input-modern" 
              type="date" 
              value={filters.hasta} 
              onChange={(e) => handleInputChange('hasta', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Legajo</label>
            <input 
              className="input-modern" 
              placeholder="Filtrar por legajo..." 
              value={filters.legajo} 
              onChange={(e) => handleInputChange('legajo', e.target.value)}
              onBlur={(e) => handleInputChange('legajo', e.target.value.trim())} // Trim al perder foco
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre/Apellido</label>
            <input 
              className="input-modern" 
              placeholder="Filtrar por nombre..." 
              value={filters.nombre} 
              onChange={(e) => handleInputChange('nombre', e.target.value)}
              onBlur={(e) => handleInputChange('nombre', e.target.value.trim())} // Trim al perder foco
            />
          </div>
          
          {/* Solo mostrar filtro de área para RRHH */}
          {user?.rol === "rrhh" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Área <span className="text-gray-400 text-xs">(RRHH)</span>
              </label>
              <input
                className="input-modern"
                value={filters.area}
                onChange={(e) => handleInputChange('area', e.target.value)}
                onBlur={(e) => handleInputChange('area', e.target.value.trim())} // Trim al perder foco
                placeholder="Filtrar por área - vacío = todas"
              />
            </div>
          )}
        </div>

        {/* Información del área para Admin */}
        {user?.rol === "admin" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center text-blue-800">
              <span className="text-sm">📋</span>
              <span className="ml-2 text-sm font-medium">
                Mostrando reportes del área: <strong>{user?.lugarTrabajo || "Sin área asignada"}</strong>
              </span>
            </div>
          </div>
        )}

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

        {/* Resto del código permanece igual */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
          </div>
        ) : result.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📈</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin resultados</h3>
            <p className="text-gray-600">
              {filters.desde || filters.hasta || filters.legajo || filters.nombre || (user?.rol === "rrhh" && filters.area)
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
              {user?.rol === "rrhh" && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(result.map(r => r.lugarTrabajo)).size}
                  </div>
                  <div className="text-sm text-gray-600">Áreas diferentes</div>
                </div>
              )}
            </div>

            {/* Tabla de Resultados */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 900 }}>
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
              {user?.rol === "admin" && ` • Área: ${user?.lugarTrabajo}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}