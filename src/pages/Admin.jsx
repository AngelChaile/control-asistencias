import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import QrGenerator from "../components/QrGenerator";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Obtener datos del admin desde Firestore
      const q = query(collection(db, "users"), where("__name__", "==", uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setUser(data);
        setArea(data.lugarTrabajo || "");
      }
    } catch (err) {
      alert("Error de login: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAsistencias() {
    if (!area) return;
    const q = query(collection(db, "asistencias"), where("lugarTrabajo", "==", area));
    const snap = await getDocs(q);
    const lista = snap.docs.map((d) => {
      const data = d.data();

      // 🔹 Convertir todos los posibles Timestamps a string
      const convertirFecha = (valor) => {
        if (!valor) return "";
        if (valor.toDate) return valor.toDate().toLocaleString("es-AR");
        if (valor.seconds) return new Date(valor.seconds * 1000).toLocaleString("es-AR");
        return valor;
      };

      data.createdAtStr = convertirFecha(data.createdAt);
      data.fechaStr = convertirFecha(data.fecha);
      data.horaStr = convertirFecha(data.hora);

      return data;
    });
    setAsistencias(lista);
  }

  useEffect(() => {
    if (user) loadAsistencias();
  }, [user]);

  if (!user) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Login Admin / RRHH</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <br />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <br />
          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Panel Admin - {user.lugarTrabajo}</h2>

      {/* Generador de QR */}
      <QrGenerator area={area} />

      {/* Listado de asistencias */}
      <h3>Asistencias registradas</h3>
      <button onClick={loadAsistencias} style={{ marginBottom: "10px" }}>
        🔄 Actualizar
      </button>

      <table border="1" cellPadding="5" style={{ width: "100%", textAlign: "center" }}>
        <thead style={{ background: "#f2f2f2" }}>
          <tr>
            <th>Legajo</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Tipo</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Lugar de Trabajo</th>
            <th>Registrado</th>
          </tr>
        </thead>
        <tbody>
          {asistencias.map((a, idx) => (
            <tr key={idx}>
              <td>{a.legajo}</td>
              <td>{a.nombre}</td>
              <td>{a.apellido}</td>
              <td>{a.tipo}</td>
              <td>{a.fechaStr}</td>
              <td>{a.horaStr}</td>
              <td>{a.lugarTrabajo}</td>
              <td>{a.createdAtStr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
