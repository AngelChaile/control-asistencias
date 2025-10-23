import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
import { fetchEmpleadosByLugarTrabajo } from "../../utils/usuarios";
import { saveAusenciaJustificacion } from "../../utils/ausencias";
import { fetchAsistenciasByDate, fetchAusenciasByRange } from "../../utils/asistencia";

// helpers de fecha (sin shift UTC)
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
          fetchAsistenciasByDate(fechaDate, lugar),
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
      console.log("DEBUG: handleSaveJust called", { legajo, justificativo, justificar, fechaInput });

      const fechaDate = parseInputDateToLocal(fechaInput);

      // llamar al upsert de ausencias (la función busca y completa nombre/apellido/lugarTrabajo)
      const saved = await saveAusenciaJustificacion({
        legajo,
        fecha: fechaDate,
        justificativo,
        justificar,
      });

      console.log("DEBUG: saveAusenciaJustificacion returned:", JSON.stringify(saved, null, 2));

      setEdit(null);

      // Forzar recarga de ausencias para la fecha exacta desde BD (asegura consistencia)
      try {
        const ausReload = await fetchAusenciasByRange({ desde: fechaDate, hasta: fechaDate, area: lugar });
        console.log("DEBUG: ausencias reloaded from BD:", JSON.stringify(ausReload || [], null, 2));
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

      // recargar asistencias para la fecha (opc)
      const asist = await fetchAsistenciasByDate(fechaDate, lugar);
      setAsistencias(asist || []);
    } catch (err) {
      console.error("handleSaveJust error:", err);
    }
  }

  // render
  return (
    <div style={{ padding: 16 }}>
      <h2>Ausencias - Área {lugar}</h2>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <label>
          Fecha:
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>

        <ExportExcel
          data={[
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
          ]}
          filename={`ausencias_${lugar}_${selectedDate}.xlsx`}
        />
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <h3>Empleados (fecha: {selectedDate})</h3>

          {faltantes.length === 0 ? (
            <p>No hay empleados sin fichar en la fecha seleccionada.</p>
          ) : (
            <table border="1" cellPadding="8">
              <thead>
                <tr>
                  <th>Legajo</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Justificado</th>
                  <th>Justificativo</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {faltantes.map((e) => {
                  const aus = getAusenciaForDate(e.legajo, selectedDate);
                  return (
                    <tr key={`${e.legajo}-${selectedDate}`}>
                      <td>{e.legajo}</td>
                      <td>{e.nombre}</td>
                      <td>{e.apellido}</td>
                      <td>{aus ? (aus.justificado ? "Sí" : "No") : "—"}</td>
                      <td>{aus ? aus.justificativo || "" : ""}</td>
                      <td>{aus ? aus.fecha : toLocaleDateStr(parseInputDateToLocal(selectedDate))}</td>
                      <td>
                        {edit?.legajo === e.legajo ? (
                          <>
                            <input
                              type="date"
                              value={edit.fechaInput}
                              onChange={(ev) => setEdit({ ...edit, fechaInput: ev.target.value })}
                              style={{ marginRight: 6 }}
                            />
                            <input
                              placeholder="Justificativo"
                              value={edit.justificativo || ""}
                              onChange={(ev) => setEdit({ ...edit, justificativo: ev.target.value })}
                              style={{ marginRight: 6 }}
                            />
                            <button onClick={() => handleSaveJust(e.legajo, edit.justificativo || "", true, edit.fechaInput)}>
                              Guardar (Justificar)
                            </button>
                            <button onClick={() => handleSaveJust(e.legajo, "", false, edit.fechaInput)} style={{ marginLeft: 4 }}>
                              Guardar (Sin justificar)
                            </button>
                            <button onClick={() => setEdit(null)} style={{ marginLeft: 6 }}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              setEdit({
                                legajo: e.legajo,
                                justificativo: getAusenciaForDate(e.legajo, selectedDate)?.justificativo || "",
                                fechaInput: getAusenciaForDate(e.legajo, selectedDate)
                                  ? inputDateFromLocaleStr(getAusenciaForDate(e.legajo, selectedDate).fecha)
                                  : selectedDate,
                              })
                            }
                          >
                            {getAusenciaForDate(e.legajo, selectedDate) ? "Editar justificativo" : "Agregar justificativo"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 20 }}>Ausencias registradas (fecha seleccionada)</h3>
          {ausencias.filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate).length === 0 ? (
            <p>No hay ausencias registradas para la fecha seleccionada.</p>
          ) : (
            <table border="1" cellPadding="8">
              <thead>
                <tr>
                  <th>Legajo</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Área</th>
                  <th>Justificado</th>
                  <th>Justificativo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ausencias
                  .filter((a) => inputDateFromLocaleStr(a.fecha) === selectedDate)
                  .map((a) => (
                    <tr key={a.id || `${a.legajo}-${a.fecha}`}>
                      <td>{a.legajo}</td>
                      <td>{a.nombre || ""}</td>
                      <td>{a.apellido || ""}</td>
                      <td>{a.lugarTrabajo || ""}</td>
                      <td>{a.justificado ? "Sí" : "No"}</td>
                      <td>{a.justificativo || ""}</td>
                      <td>{a.fecha || ""}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}