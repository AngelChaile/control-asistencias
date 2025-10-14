import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import QrGenerator from "../components/QrGenerator";

/**
 * Admin page: expects prop user (from App) with .rol and .lugarTrabajo
 */
export default function Admin({ user }) {
  const [asistencias, setAsistencias] = useState([]);
  const [area, setArea] = useState(user?.lugarTrabajo || "");

  async function loadAsistencias() {
    // si user rol rrhh -> cargar todo, si admin -> cargar por area
    let q;
    if (user?.rol === "rrhh") {
      q = query(collection(db, "asistencias"));
    } else {
      q = query(collection(db, "asistencias"), where("lugarTrabajo", "==", area));
    }
    const snap = await getDocs(q);
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setAsistencias(lista);
  }

  useEffect(() => {
    loadAsistencias();
    // eslint-disable-next-line
  }, [user]);

  if (!user) return <div style={{ padding: 20 }}>Debes iniciar sesión</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Panel Admin - {user.lugarTrabajo || "General"}</h2>
      <QrGenerator area={area} />
      <h3>Asistencias registradas</h3>
      <button onClick={loadAsistencias} style={{ marginBottom: 10 }}>🔄 Actualizar</button>
      <table border="1" cellPadding="6" style={{ width: "100%", textAlign: "left" }}>
        <thead>
          <tr><th>Legajo</th><th>Nombre</th><th>Apellido</th><th>Tipo</th><th>Fecha</th><th>Hora</th><th>Lugar</th></tr>
        </thead>
        <tbody>
          {asistencias.map(a => (
            <tr key={a.id}>
              <td>{a.legajo}</td>
              <td>{a.nombre}</td>
              <td>{a.apellido}</td>
              <td>{a.tipo}</td>
              <td>{a.fecha}</td>
              <td>{a.hora}</td>
              <td>{a.lugarTrabajo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
