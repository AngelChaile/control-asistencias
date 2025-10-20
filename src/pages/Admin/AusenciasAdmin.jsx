import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ExportExcel from "../../components/ExportExcel";
import {
  fetchEmpleadosByLugarTrabajo,
  fetchAsistenciasByDate,
  saveAusenciaJustificacion,
} from "../../utils/usuarios"; // o adapta a los utils correctos

export default function AusenciasAdmin() {
  const { user } = useAuth();
  const lugar = user?.lugarTrabajo || "";
  const [empleados, setEmpleados] = useState([]);
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
        setAusencias(asist || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lugar]);

  // empleados que no ficharon = empleados - asistencias (por legajo)
  const faltantes = empleados.filter(
    (e) => !ausencias.some((a) => String(a.legajo) === String(e.legajo))
  );

  async function handleSaveJust(legajo, justificativo, justificar = true) {
    try {
      await saveAusenciaJustificacion({ legajo, fecha: new Date(), justificativo, justificar });
      // recargar lista (simplemente actualizar estado local)
      setEdit(null);
      // volver a cargar ausencias para reflejar cambios
      const asist = await fetchAsistenciasByDate(new Date(), lugar);
      setAusencias(asist || []);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Ausencias - Área {lugar}</h2>

      <div style={{ marginBottom: 12 }}>
        <ExportExcel data={faltantes} filename={`ausencias_${lugar}_${new Date().toISOString().slice(0,10)}.xlsx`} />
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : faltantes.length === 0 ? (
        <p>No hay empleados sin fichar hoy.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {faltantes.map((e) => (
              <tr key={e.legajo}>
                <td>{e.legajo}</td>
                <td>{e.nombre}</td>
                <td>{e.apellido}</td>
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
                    <>
                      <button onClick={() => setEdit({ legajo: e.legajo, justificativo: "" })}>Editar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}