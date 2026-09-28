// src/pages/RRHH/Vacaciones/ListaVacaciones.jsx
import React, { useState, useEffect, useCallback } from "react";
import { fetchSolicitudesVacaciones, actualizarEstadoSolicitud } from "../../../utils/vacaciones";
import FormularioImpresion from "./FormularioImpresion";

const ANIO_ACTUAL = new Date().getFullYear();

const ESTADO_BADGE = {
  pendiente:  { label: "Pendiente",  cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  aprobada:   { label: "Aprobada",   cls: "bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300"  },
  rechazada:  { label: "Rechazada",  cls: "bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300"    },
};

export default function ListaVacaciones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  // Filtros
  const [filtroLegajo, setFiltroLegajo] = useState("");
  const [filtroArea,   setFiltroArea]   = useState("");
  const [filtroAnio,   setFiltroAnio]   = useState(ANIO_ACTUAL);
  const [filtroEstado, setFiltroEstado] = useState("");

  // Vista de impresión
  const [solicitudImpresion, setSolicitudImpresion] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSolicitudesVacaciones({
        legajo: filtroLegajo,
        area:   filtroArea,
        anio:   filtroAnio || null,
        estado: filtroEstado,
      });
      setSolicitudes(data);
    } catch (e) {
      setError("Error al cargar solicitudes: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [filtroLegajo, filtroArea, filtroAnio, filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await actualizarEstadoSolicitud(id, nuevoEstado);
      setSolicitudes(prev =>
        prev.map(s => s.id === id ? { ...s, estado: nuevoEstado } : s)
      );
    } catch (e) {
      setError("Error al actualizar estado: " + e.message);
    }
  };

  if (solicitudImpresion) {
    return (
      <FormularioImpresion
        solicitud={solicitudImpresion}
        onVolver={() => setSolicitudImpresion(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            📋 Solicitudes de Licencia Anual Ordinaria
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Gestión y seguimiento de solicitudes de vacaciones.
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              type="text" placeholder="Legajo..." value={filtroLegajo}
              onChange={e => setFiltroLegajo(e.target.value)}
              className="input-base text-sm"
            />
            <input
              type="text" placeholder="Área..." value={filtroArea}
              onChange={e => setFiltroArea(e.target.value)}
              className="input-base text-sm"
            />
            <input
              type="number" placeholder="Año..." value={filtroAnio}
              onChange={e => setFiltroAnio(e.target.value)}
              className="input-base text-sm" min="2020" max="2099"
            />
            <select
              value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="input-base text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : solicitudes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>No se encontraron solicitudes con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map(s => {
              const badge = ESTADO_BADGE[s.estado] || ESTADO_BADGE.pendiente;
              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-gray-400">{s.nroSolicitud}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {s.esReingreso && (
                        <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full font-semibold">
                          Reingreso
                        </span>
                      )}
                      {s.esCambioConvenio && (
                        <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                          Cambio convenio
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-white truncate">{s.nombreCompleto}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Legajo {s.legajo} · {s.area || "Sin área"} · {s.convenio}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Período {s.anioVacacional} · {s.diasSolicitados} días solicitados de {s.diasCorresponden} ({s.tipoDias})
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    <button
                      onClick={() => setSolicitudImpresion(s)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      🖨️ Imprimir
                    </button>
                    {s.estado === "pendiente" && (
                      <>
                        <button
                          onClick={() => handleCambiarEstado(s.id, "aprobada")}
                          className="text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          onClick={() => handleCambiarEstado(s.id, "rechazada")}
                          className="text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          ❌ Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
