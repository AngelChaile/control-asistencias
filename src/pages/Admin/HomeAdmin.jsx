// src/pages/Admin.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import QrGenerator from "../../components/QrGenerator";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

export default function Admin({ user, onLogout }) {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  const rol = user?.rol || "";
  const area = user?.lugarTrabajo || "";

  useEffect(() => {
    if (!user) return;

    async function fetchAsistencias() {
      setLoading(true);
      try {
        let q;
        if (rol === "rrhh") {
          q = query(collection(db, "asistencias"));
        } else if (rol === "admin" && area) {
          q = query(collection(db, "asistencias"), where("lugarTrabajo", "==", area));
        } else {
          setLoading(false);
          return;
        }

        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAsistencias(data);
      } catch (err) {
        console.error("Error cargando asistencias:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAsistencias();
  }, [user]);

  return (
    <div>
      {/* Mostrar el menú si el usuario es admin o rrhh */}
      {rol !== "empleado" && <Navbar user={user} onLogout={onLogout} />}

      <div style={{ padding: 16 }}>
        <h2>Panel {rol === "rrhh" ? "Recursos Humanos" : `Área ${area}`}</h2>

        {rol !== "empleado" && (
          <div style={{ marginBottom: 20 }}>
            <QrGenerator area={area} user={user} />
          </div>
        )}

        {loading ? (
          <p>Cargando asistencias...</p>
        ) : asistencias.length > 0 ? (
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Legajo</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Área</th>
              </tr>
            </thead>
            <tbody>
              {asistencias.map((a) => {
                const fecha = a.fecha?.seconds
                  ? new Date(a.fecha.seconds * 1000).toLocaleDateString("es-AR")
                  : a.fecha || "";
                const hora = a.hora?.seconds
                  ? new Date(a.hora.seconds * 1000).toLocaleTimeString("es-AR")
                  : a.hora || "";
                return (
                  <tr key={a.id}>
                    <td>{a.legajo}</td>
                    <td>{a.nombre}</td>
                    <td>{a.apellido}</td>
                    <td>{a.tipo}</td>
                    <td>{fecha}</td>
                    <td>{hora}</td>
                    <td>{a.lugarTrabajo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No hay asistencias registradas.</p>
        )}
      </div>
    </div>
  );
}
