// src/pages/HR.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { exportToCsv } from "../components/ExportCSV";
import Employee from "../components/Employee";
import Menu from "../components/Menu";

export default function HR({ user }) {
  const [asistencias, setAsistencias] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [view, setView] = useState("asistencias");

  useEffect(() => {
    if (!user) return;
    fetchAsistencias();
    fetchEmpleados();
  }, [user]);

  async function fetchAsistencias() {
    if (!user) return;
    try {
      let q;
      if (user.rol === "rrhh") {
        q = query(collection(db, "asistencias"), orderBy("createdAt", "desc"));
      } else {
        q = query(
          collection(db, "asistencias"),
          where("area", "==", user.area),
          orderBy("createdAt", "desc")
        );
      }
      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => {
        const data = d.data();
        let createdAtStr = "";
        if (data.createdAt?.seconds) {
          const date = new Date(data.createdAt.seconds * 1000);
          createdAtStr = date.toLocaleString("es-AR");
        }
        return { id: d.id, ...data, createdAtStr };
      });
      setAsistencias(lista);
    } catch (err) {
      console.error("Error cargando asistencias:", err);
    }
  }

  async function fetchEmpleados() {
    if (!user) return;
    try {
      let q;
      if (user.rol === "rrhh") {
        q = query(collection(db, "empleados"));
      } else {
        q = query(collection(db, "empleados"), where("area", "==", user.area));
      }
      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEmpleados(lista);
    } catch (err) {
      console.error("Error cargando empleados:", err);
    }
  }

  function exportAll() {
    exportToCsv("asistencias.csv", asistencias);
  }

  return (
    <div style={{ padding: 20 }}>
      <Menu user={user} onChangeView={setView} />
      <h2 style={{ marginTop: 20 }}>
        {user?.rol === "rrhh" ? "Recursos Humanos" : `Panel - ${user?.area}`}
      </h2>

      {view === "asistencias" && (
        <>
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
                <th>Lugar</th>
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
                  <td>{a.createdAtStr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {view === "empleados" && (
        <>
          <h3 style={{ marginTop: 20 }}>Listado de empleados</h3>
          <Employee empleados={empleados} />
        </>
      )}
    </div>
  );
}
