import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
import { fetchEmpleadosByLugarTrabajo, saveAusenciaJustificacion } from "../../utils/usuarios";
import { fetchAsistenciasByDate, fetchAusenciasByRange } from "../../utils/asistencia";

export default function AusenciasAdmin() {
  const { user } = useAuth();
  const lugar = user?.lugarTrabajo || "";
  const [empleados, setEmpleados] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [ausencias, setAusencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(null); // { legajo, justificativo }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const emp = await fetchEmpleadosByLugarTrabajo(lugar);
        setEmpleados(emp || []);

        const asist = await fetchAsistenciasByDate(new Date(), lugar);
        setAsistencias(asist || []);

        // traer ausencias registradas hoy para esta área
        const hoy = new Date();
        const aus = await fetchAusenciasByRange({ desde: hoy, hasta: hoy, area: lugar });
        setAusencias(aus || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (lugar) load();
  }, [lugar]);

  // Lista de empleados del área que no ficharon HOY.
  // NOTA: NO excluimos aquí a los que ya tienen ausencia registrada: deben seguir apareciendo
  const faltantes = empleados.filter((e) => !asistencias.some((a) => String(a.legajo) === String(e.legajo)));

  async function handleSaveJust(legajo, justificativo, justificar = true) {
    try {
      await saveAusenciaJustificacion({ legajo, fecha: new Date(), justificativo, justificar });
      setEdit(null);

      // recargar asistencias y ausencias luego de guardar
      const [asist, aus] = await Promise.all([
        fetchAsistenciasByDate(new Date(), lugar),
        fetchAusenciasByRange({ desde: new Date(), hasta: new Date(), area: lugar }),
      ]);
      setAsistencias(asist || []);
      setAusencias(aus || []);
    } catch (err) {
      console.error(err);
    }
  }

  // helper para obtener ausencia del empleado hoy (si existe)
  function getAusenciaHoy(legajo) {
    return ausencias.find((au) => String(au.legajo) === String(legajo));
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Ausencias - Área {lugar}</h2>

      <div style={{ marginBottom: 12 }}>
        <ExportExcel
          data={[
            ...faltantes.map((f) => ({
              legajo: f.legajo,
              nombre: f.nombre,
              apellido: f.apellido,
              lugarTrabajo: f.lugarTrabajo,
              justificativo: getAusenciaHoy(f.legajo)?.justificativo || null,
              justificado: getAusenciaHoy(f.legajo)?.justificado || false,
            })),
            ...ausencias,
          ]}
          filename={`ausencias_${lugar}_${new Date().toISOString().slice(0, 10)}.xlsx`}
        />
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <h3>Empleados sin fichar hoy</h3>
          {faltantes.length === 0 ? (
            <p>No hay empleados sin fichar hoy.</p>
          ) : (
            <table border="1" cellPadding="8">
              <thead>
                <tr>
                  <th>Legajo</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Justificado</th>
                  <th>Justificativo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {faltantes.map((e) => {
                  const aus = getAusenciaHoy(e.legajo);
                  return (
                    <tr key={e.legajo}>
                      <td>{e.legajo}</td>
                      <td>{e.nombre}</td>
                      <td>{e.apellido}</td>
                      <td>{aus ? (aus.justificado ? "Sí" : "No") : "—"}</td>
                      <td>{aus ? aus.justificativo || "" : ""}</td>
                      <td>
                        {edit?.legajo === e.legajo ? (
                          <>
                            <input
                              placeholder="Justificativo"
                              value={edit.justificativo || ""}
                              onChange={(ev) => setEdit({ ...edit, justificativo: ev.target.value })}
                            />
                            <button onClick={() => handleSaveJust(e.legajo, edit.justificativo, true)}>Guardar (Justificar)</button>
                            <button onClick={() => handleSaveJust(e.legajo, "", false)}>Guardar (Sin justificar)</button>
                            <button onClick={() => setEdit(null)}>Cancelar</button>
                          </>
                        ) : (
                          <button onClick={() => setEdit({ legajo: e.legajo, justificativo: aus?.justificativo || "" })}>
                            {aus ? "Editar justificativo" : "Agregar justificativo"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 20 }}>Ausencias registradas hoy</h3>
          {ausencias.length === 0 ? (
            <p>No hay ausencias registradas hoy.</p>
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
                </tr>
              </thead>
              <tbody>
                {ausencias.map((a) => (
                  <tr key={a.id || `${a.legajo}-${a.fecha}`}>
                    <td>{a.legajo}</td>
                    <td>{a.nombre || ""}</td>
                    <td>{a.apellido || ""}</td>
                    <td>{a.lugarTrabajo || ""}</td>
                    <td>{a.justificado ? "Sí" : "No"}</td>
                    <td>{a.justificativo || ""}</td>
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