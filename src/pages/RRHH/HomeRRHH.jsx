import React, { useEffect, useState } from "react";
import { fetchAsistenciasToday } from "../../utils/asistencia";

export default function HomeRRHH() {
  const [asistencias, setAsistencias] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "", lugarTrabajo: "" });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    areas: 0,
    entradas: 0,
    salidas: 0
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchAsistenciasToday();
        setAsistencias(rows || []);

        // Normalizar y contar entradas/salidas (case-insensitive)
        const entradas = (rows || []).filter(a => String(a.tipo || "").toLowerCase() === "entrada").length;
        const salidas = (rows || []).filter(a => String(a.tipo || "").toLowerCase() === "salida").length;
        const areasUnicas = new Set((rows || []).map(a => a.lugarTrabajo || "").filter(Boolean)).size;

        setStats({
          total: (rows || []).length,
          areas: areasUnicas,
          entradas,
          salidas
        });
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
    <div className="app-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Recursos Humanos</h1>
        <p className="text-gray-600">Gestión integral de personal y asistencias</p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">{stats.salidas}</div>
          <div className="text-gray-600">Salidas Registradas</div>
          <div className="w-12 h-1 bg-blue-500 rounded mx-auto mt-3"></div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">{stats.entradas}</div>
          <div className="text-gray-600">Entradas Registradas</div>
          <div className="w-12 h-1 bg-green-500 rounded mx-auto mt-3"></div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-2">{stats.areas}</div>
          <div className="text-gray-600">Áreas Activas</div>
          <div className="w-12 h-1 bg-purple-500 rounded mx-auto mt-3"></div>
        </div>
      </div>

      {/* Tabla de Asistencias */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Asistencias del Día</h3>
            <p className="text-gray-600">Registros de entrada y salida</p>
          </div>
          <div className="text-sm text-gray-600">
            {filtered.length} de {asistencias.length} registros
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por legajo</label>
            <input 
              className="input-modern" 
              placeholder="Número de legajo..." 
              value={filter.legajo} 
              onChange={(e) => setFilter({ ...filter, legajo: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por nombre</label>
            <input 
              className="input-modern" 
              placeholder="Nombre o apellido..." 
              value={filter.nombre} 
              onChange={(e) => setFilter({ ...filter, nombre: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por área</label>
            <input 
              className="input-modern" 
              placeholder="Área o departamento..." 
              value={filter.lugarTrabajo} 
              onChange={(e) => setFilter({ ...filter, lugarTrabajo: e.target.value })} 
            />
          </div>
        </div>

        {/* Tabla de Resultados */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {a.lugarTrabajo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {a.hora}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {a.fecha}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros</h3>
            <p className="text-gray-600">
              {asistencias.length === 0 
                ? "No se han registrado asistencias para hoy" 
                : "No se encontraron registros con los filtros aplicados"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}