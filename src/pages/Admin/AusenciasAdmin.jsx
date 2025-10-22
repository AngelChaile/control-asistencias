import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
import { fetchEmpleadosByLugarTrabajo } from "../../utils/usuarios";
import { saveAusenciaJustificacion } from "../../utils/ausencias";
import { fetchAsistenciasByDate, fetchAusenciasByRange } from "../../utils/asistencia";

/**
 * Helpers de fecha:
 * input date (YYYY-MM-DD) <-> display fecha (dd/mm/yyyy)
 */
function toLocaleDateStr(date) {
  if (!(date instanceof Date)) return null;
  return date.toLocaleDateString("es-AR");
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

// nuevo helper: parsear "YYYY-MM-DD" a Date local (sin shift UTC)
function parseInputDateToLocal(isoYmd) {
  if (!isoYmd) return new Date();
  const [y, m, d] = String(isoYmd).split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
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

  useEffect(() => {
    async function load() {
      if (!lugar) return;
      setLoading(true);
      try {
        const fechaDate = parseInputDateToLocal(selectedDate);
        const emp = await fetchEmpleadosByLugarTrabajo(lugar);
        setEmpleados(emp || []);

        const asist = await fetchAsistenciasByDate(fechaDate, lugar);
        setAsistencias(asist || []);

        const aus = await fetchAusenciasByRange({ desde: fechaDate, hasta: fechaDate, area: lugar });
        setAusencias(aus || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lugar, selectedDate]);

  // empleados que no ficharon en la fecha seleccionada (siguen apareciendo aunque tengan ausencia)
  const faltantes = empleados.filter(
    (e) => !asistencias.some((a) => String(a.legajo) === String(e.legajo))
  );

  // obtiene ausencia del legajo para la fecha seleccionada
  function getAusenciaForDate(legajo, fechaInput = selectedDate) {
    // ausencias vienen con campo fecha en "dd/mm/yyyy"
    return ausencias.find((au) => {
      if (String(au.legajo) !== String(legajo)) return false;
      if (!au.fecha) return false;
      const auInput = inputDateFromLocaleStr(au.fecha);
      return auInput === fechaInput;
    });
  }

  async function handleSaveJust(legajo, justificativo, justificar = true, fechaInput = selectedDate) {
    try {
      console.log("DEBUG: handleSaveJust called", { legajo, justificativo, justificar, fechaInput });

      const fechaDate = parseInputDateToLocal(fechaInput);

      const saved = await saveAusenciaJustificacion({
        legajo,
        fecha: fechaDate,
        justificativo,
        justificar,
      });

      // mostrar el objeto concreto en logs
      console.log("DEBUG: saveAusenciaJustificacion returned:", JSON.stringify(saved, null, 2));

      setEdit(null);

      // actualizar estado local de ausencias (logueando el nuevo estado)
      setAusencias((prev) => {
        const fechaStr = typeof saved.fecha === "string" ? saved.fecha : toLocaleDateStr(fechaDate);
        const filtered = prev.filter(
          (p) => !(String(p.legajo) === String(legajo) && String(p.fecha) === String(fechaStr))
        );
        const newState = [...filtered, { ...saved }];
        console.log("DEBUG: ausencias state after local update:", JSON.stringify(newState, null, 2));
        return newState;
      });

      // recargar ausencias directamente desde BD para garantizar que se vea en la tabla
      try {
        const ausReload = await fetchAusenciasByRange({ desde: fechaDate, hasta: fechaDate, area: lugar });
        console.log("DEBUG: ausencias reloaded from DB:", JSON.stringify(ausReload || [], null, 2));
        setAusencias(ausReload || []);
      } catch (err) {
        console.warn("No se pudo recargar ausencias desde DB:", err);
      }

      // recargar asistencias para la fecha (opcional)
      const asist = await fetchAsistenciasByDate(fechaDate, lugar);
      setAsistencias(asist || []);
    } catch (err) {
      console.error("handleSaveJust error:", err);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold">Ausencias - Área {lugar}</h2>

        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2">
            <span className="text-sm">Fecha:</span>
            <input className="border rounded px-3 py-1" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>

          <ExportExcel data={[
            ...faltantes.map((f) => {
              const aus = getAusenciaForDate(f.legajo, selectedDate);
              return {
                legajo: f.legajo,
                nombre: f.nombre,
                apellido: f.apellido,
                lugarTrabajo: f.lugarTrabajo,
                justificativo: aus?.justificativo || null,
                justificado: aus?.justificado || false,
                fecha: aus?.fecha || toLocaleDateStr(parseInputDateToLocal(selectedDate)),
              };
            }),
            ...ausencias.filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate),
          ]} filename={`ausencias_${lugar}_${selectedDate}.xlsx`} />
        </div>

        {loading ? (
          <p className="text-gray-500 mt-4">Cargando...</p>
        ) : (
          <>
            <h3 className="mt-6 text-lg font-medium">Empleados (fecha: {selectedDate})</h3>
            {faltantes.length === 0 ? (
              <p className="text-gray-500 mt-2">No hay empleados sin fichar en la fecha seleccionada.</p>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Justificado</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Justificativo</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {faltantes.map((e) => {
                      const aus = getAusenciaForDate(e.legajo, selectedDate);
                      return (
                        <tr key={`${e.legajo}-${selectedDate}`}>
                          <td className="px-4 py-2 text-sm text-gray-800">{e.legajo}</td>
                          <td className="px-4 py-2 text-sm text-gray-800">{e.nombre}</td>
                          <td className="px-4 py-2 text-sm text-gray-800">{e.apellido}</td>
                          <td className="px-4 py-2 text-sm text-gray-800">{aus ? (aus.justificado ? "Sí" : "No") : "—"}</td>
                          <td className="px-4 py-2 text-sm text-gray-800">{aus ? aus.justificativo || "" : ""}</td>
                          <td className="px-4 py-2 text-sm text-gray-800">{aus ? aus.fecha : toLocaleDateStr(parseInputDateToLocal(selectedDate))}</td>
                          <td className="px-4 py-2 text-sm text-gray-800">
                            {edit?.legajo === e.legajo ? (
                              <div className="flex flex-wrap gap-2 items-center">
                                <input className="border rounded px-2 py-1" type="date" value={edit.fechaInput} onChange={(ev) => setEdit({ ...edit, fechaInput: ev.target.value })} />
                                <input className="border rounded px-3 py-1" placeholder="Justificativo" value={edit.justificativo || ""} onChange={(ev) => setEdit({ ...edit, justificativo: ev.target.value })} />
                                <button onClick={() => handleSaveJust(e.legajo, edit.justificativo || "", true, edit.fechaInput)} className="px-3 py-1 bg-municipio-500 text-white rounded">Guardar (Justificar)</button>
                                <button onClick={() => handleSaveJust(e.legajo, "", false, edit.fechaInput)} className="px-3 py-1 bg-gray-200 rounded">Guardar (Sin justificar)</button>
                                <button onClick={() => setEdit(null)} className="px-3 py-1 border rounded">Cancelar</button>
                              </div>
                            ) : (
                              <button onClick={() => setEdit({ legajo: e.legajo, justificativo: aus?.justificativo || "", fechaInput: aus?.fecha ? inputDateFromLocaleStr(aus.fecha) : selectedDate })} className="px-3 py-1 bg-municipio-100 text-municipio-700 rounded">{aus ? "Editar justificativo" : "Agregar justificativo"}</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="mt-6 text-lg font-medium">Ausencias registradas (fecha seleccionada)</h3>
            {ausencias.filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate).length === 0 ? (
              <p className="text-gray-500 mt-2">No hay ausencias registradas para la fecha seleccionada.</p>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Área</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Justificado</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Justificativo</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {ausencias.filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate).map((a) => (
                      <tr key={a.id || `${a.legajo}-${a.fecha}`}>
                        <td className="px-4 py-2 text-sm text-gray-800">{a.legajo}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{a.nombre || ""}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{a.apellido || ""}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{a.lugarTrabajo || ""}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{a.justificado ? "Sí" : "No"}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{a.justificativo || ""}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{a.fecha || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}