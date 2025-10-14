import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { exportToCsv } from "../components/ExportCSV";
import { obtenerUsuarioActual } from "../utils/auth.js";

export default function HR() {
  const [asistencias, setAsistencias] = useState([]);

  useEffect(() => {
    async function checkAccess() {
      const user = await obtenerUsuarioActual();

      if (!user) {
        alert("Debes iniciar sesión para acceder.");
        window.location.href = "/login.html";
        return;
      }

      // Solo RRHH puede ver este módulo
      if (user.rol !== "rrhh") {
        alert("No tienes permisos para acceder a este módulo.");
        window.location.href = "/index.html";
        return;
      }

      console.log("✅ Acceso permitido a RRHH");
      fetchAsistencias();
    }

    checkAccess();
  }, []);

  async function fetchAsistencias() {
    const q = query(collection(db, "asistencias"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const lista = snap.docs.map((d) => {
      const data = d.data();
      if (data.createdAt?.seconds) {
        const date = new Date(data.createdAt.seconds * 1000);
        data.createdAtStr = date.toLocaleString("es-AR");
      }
      return { id: d.id, ...data };
    });

    setAsistencias(lista);
  }

  function exportAll() {
    exportToCsv("asistencias.csv", asistencias);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Recursos Humanos - Registro de Asistencias</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={fetchAsistencias}>🔄 Refrescar</button>{" "}
        <button onClick={exportAll}>📤 Exportar CSV</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f2f2f2" }}>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Legajo</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Tipo</th>
            <th>Lugar de Trabajo</th>
            <th>Registrado</th>
          </tr>
        </thead>
        <tbody>
          {asistencias.map((a) => (
            <tr key={a.id}>
              <td>{a.fecha}</td>
              <td>{a.hora}</td>
              <td>{a.legajo}</td>
              <td>{a.nombre}</td>
              <td>{a.apellido}</td>
              <td>{a.tipo}</td>
              <td>{a.lugarTrabajo}</td>
              <td>{a.createdAtStr || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
