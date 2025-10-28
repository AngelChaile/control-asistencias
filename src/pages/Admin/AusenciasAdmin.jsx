import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
import { formatAdminAusencias } from "../../utils/excelFormats";
import { fetchEmpleadosByLugarTrabajo } from "../../utils/usuarios";
import { saveAusenciaJustificacion } from "../../utils/ausencias";
import { fetchAsistenciasByDate, fetchAusenciasByRange } from "../../utils/asistencia";

// helpers de fecha (sin shift UTC) - MANTENIENDO TUS CORRECCIONES
function parseInputDateToLocal(isoYmd) {
  if (!isoYmd) return new Date();
  const [y, m, d] = String(isoYmd).split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
}
function toLocaleDateStr(dateObj) {
  if (!(dateObj instanceof Date)) return "";
  const d = dateObj.getDate().toString().padStart(2, "0");
  const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const y = dateObj.getFullYear().toString();
  return `${d}/${m}/${y}`;
}
function inputDateFromLocaleStr(fechaStr) {
  if (!fechaStr) return "";
  const parts = String(fechaStr).split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function AusenciasAdmin() {
  const { user } = useAuth();
  const lugar = user?.lugarTrabajo || "";

  const [selectedDate, setSelectedDate] = useState(todayInputValue()); // YYYY-MM-DD
  const [empleados, setEmpleados] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [ausencias, setAusencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(null); // { legajo, justificativo, fechaInput }

  // carga inicial / cada vez que cambia lugar o fecha seleccionada
  useEffect(() => {
    async function load() {
      if (!lugar) return;
      setLoading(true);
      try {
        const fechaDate = parseInputDateToLocal(selectedDate);

        const [emp, asist, aus] = await Promise.all([
          fetchEmpleadosByLugarTrabajo(lugar),
          fetchAsistenciasByDate(fechaDate, lugar), // probando correccion
          fetchAusenciasByRange({ desde: fechaDate, hasta: fechaDate, area: lugar }),
        ]);

        setEmpleados(emp || []);
        setAsistencias(asist || []);
        setAusencias(aus || []);
      } catch (err) {
        console.error("AusenciasAdmin load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lugar, selectedDate]);

  // empleados que NO ficharon en la fecha seleccionada (se muestran aunque tengan ausencia)
  const faltantes = empleados.filter(
    (e) => !asistencias.some((a) => String(a.legajo) === String(e.legajo))
  );

  // obtiene ausencia del legajo para la fecha seleccionada usando normalización
  function getAusenciaForDate(legajo, fechaInput = selectedDate) {
    const target = parseInputDateToLocal(fechaInput);
    const targetStr = toLocaleDateStr(target); // dd/mm/yyyy
    return ausencias.find((au) => String(au.legajo) === String(legajo) && String(au.fecha) === targetStr);
  }

  // guardar/actualizar justificativo para la fecha seleccionada o la que pase el admin
  async function handleSaveJust(legajo, justificativo, justificar = true, fechaInput = selectedDate) {
    try {
      const fechaDate = parseInputDateToLocal(fechaInput);

      // llamar al upsert de ausencias (la función busca y completa nombre/apellido/lugarTrabajo)
      const saved = await saveAusenciaJustificacion({
        legajo,
        fecha: fechaDate,
        justificativo,
        justificar,
      });

      setEdit(null);

      // Forzar recarga de ausencias para la fecha exacta desde BD (asegura consistencia)
      try {
        const ausReload = await fetchAusenciasByRange({ desde: fechaDate, hasta: fechaDate, area: lugar });
        setAusencias(ausReload || []);
      } catch (err) {
        console.warn("No se pudo recargar ausencias desde BD:", err);
        // fallback: actualizar estado local con el objeto retornado
        setAusencias((prev) => {
          const fechaStr = typeof saved.fecha === "string" ? saved.fecha : toLocaleDateStr(fechaDate);
          const filtered = prev.filter(
            (p) => !(String(p.legajo) === String(legajo) && String(p.fecha) === String(fechaStr))
          );
          return [...filtered, { ...saved }];
        });
      }

      // recargar asistencias para la fecha
      const asist = await fetchAsistenciasByDate(fechaDate, lugar);
      setAsistencias(asist || []);
    } catch (err) {
      console.error("handleSaveJust error:", err);
      alert("Error al guardar la justificación: " + (err.message || ""));
    }
  }


  // preparar filas de export: desduplicar por legajo y mantener sólo:
  // - ausencias justificadas, o
  // - ausencias cuyo legajo aparece una sola vez (sin duplicados)
  const ausenciasParaFecha = ausencias.filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate);

  // agrupar por legajo
  const grupos = ausenciasParaFecha.reduce((acc, a) => {
    const key = String(a.legajo || "");
    acc[key] = acc[key] || [];
    acc[key].push(a);
    return acc;
  }, {});

  // seleccionar un representante por legajo:
  const seleccionadas = Object.values(grupos).map((grupo) => {
    if (grupo.length === 1) return grupo[0];
    // si hay alguna justificadas, elegir la primera justificada
    const just = grupo.find((g) => !!g.justificado);
    if (just) return just;
    // sino elegir la más reciente por createdAt/updatedAt
    grupo.sort((a, b) => {
      const at = a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
      const bt = b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
      return bt - at;
    });
    return grupo[0];
  });

  // filtrar según la regla: incluir si es justificada o si no había duplicados originalmente
  const filteredForExport = seleccionadas.filter((item) => {
    const groupSize = (grupos[String(item.legajo || "")] || []).length;
    return !!item.justificado || groupSize === 1;
  });

  const exportRows = formatAdminAusencias(filteredForExport);

  return (
    <div className="app-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Ausencias</h1>
        <p className="text-gray-600">Control y justificación de faltas - Área {lugar}</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Filtros y Controles */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de consulta</label>
              <input 
                className="input-modern" 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </div>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <ExportExcel
              data={exportRows}
              filename={`ausencias_${lugar}_${toLocaleDateStr(parseInputDateToLocal(selectedDate)).replace(/\//g, "-")}.xlsx`}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Sección de Empleados Faltantes */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Empleados que aun no escanearon el QR para registrar su asistencia ({faltantes.length})
                </h3>
                <span className="text-sm text-gray-500">
                  Fecha: {toLocaleDateStr(parseInputDateToLocal(selectedDate)).replace(/\//g, "-")}
                </span>
              </div>

              {faltantes.length === 0 ? (
                <div className="text-center py-8 card bg-gray-50">
                  <div className="text-gray-400 text-4xl mb-2">✅</div>
                  <p className="text-gray-600">Todos los empleados han registrado su asistencia</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 900 }}>
                     <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Justificación</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {faltantes.map((e) => {
                        const aus = getAusenciaForDate(e.legajo, selectedDate);
                        return (
                          <tr key={`${e.legajo}-${selectedDate}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="shrink-0 h-10 w-10 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                                  <span className="text-orange-600 font-medium text-sm">
                                    {e.nombre?.[0]}{e.apellido?.[0]}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {e.nombre} {e.apellido}
                                  </div>
                                  <div className="text-sm text-gray-500">Legajo: {e.legajo}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                aus?.justificado 
                                  ? 'bg-green-100 text-green-800'
                                  : aus
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {aus?.justificado ? 'Justificado' : aus ? 'Sin justificar' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                              {aus?.justificativo || (
                                <span className="text-gray-400 italic">Sin justificación</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {edit?.legajo === e.legajo ? (
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <input 
                                      className="input-modern flex-1 text-sm" 
                                      type="date" 
                                      value={edit.fechaInput} 
                                      onChange={(ev) => setEdit({ ...edit, fechaInput: ev.target.value })} 
                                    />
                                    <input 
                                      className="input-modern flex-1 text-sm" 
                                      placeholder="Motivo de ausencia..." 
                                      value={edit.justificativo || ""} 
                                      onChange={(ev) => setEdit({ ...edit, justificativo: ev.target.value })} 
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleSaveJust(e.legajo, edit.justificativo || "", true, edit.fechaInput)} 
                                      className="btn-primary text-sm px-3 py-1"
                                    >
                                      ✅ Justificar
                                    </button>
                                    <button 
                                      onClick={() => handleSaveJust(e.legajo, "", false, edit.fechaInput)} 
                                      className="btn-secondary text-sm px-3 py-1"
                                    >
                                      ❌ Sin justificar
                                    </button>
                                    <button 
                                      onClick={() => setEdit(null)} 
                                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setEdit({ 
                                    legajo: e.legajo, 
                                    justificativo: aus?.justificativo || "", 
                                    fechaInput: aus?.fecha ? inputDateFromLocaleStr(aus.fecha) : selectedDate 
                                  })} 
                                  className="btn-primary text-sm px-3 py-1"
                                >
                                  {aus ? '✏️ Editar' : '📝 Justificar'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Sección de Ausencias Enviadas a RRHH */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ausencias enviadas a Recursos Humanos ({ausencias.filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate).length})
              </h3>

              {ausencias.filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate).length === 0 ? (
                <div className="text-center py-8 card bg-gray-50">
                  <div className="text-gray-400 text-4xl mb-2">📝</div>
                  <p className="text-gray-600">No hay ausencias enviadas para esta fecha</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 900 }}>
                     <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Justificación</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {ausencias.filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate).map((a) => (
                        <tr key={a.id || `${a.legajo}-${a.fecha}`} className="hover:bg-gray-50 transition-colors">
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
                              a.justificado 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {a.justificado ? 'Justificado' : 'Sin justificar'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            {a.justificativo || (
                              <span className="text-gray-400 italic">Sin justificación registrada</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {a.fecha}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}