import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

      if (!userDoc.exists()) {
        alert("Tu cuenta no tiene datos de perfil. Contacta a RRHH.");
        return;
      }

      const data = userDoc.data();

      // Redirección según rol
      switch (data.rol) {
        case "rrhh":
          navigate("/rrhh");
          break;
        case "admin":
          navigate("/admin-area");
          break;
        case "empleado":
          navigate("/empleado");
          break;
        default:
          alert("Rol desconocido. Contacta a soporte.");
      }
    } catch (err) {
      alert("Error al iniciar sesión: " + err.message);
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Inicio de Sesión</h2>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Ingresar</button>
      </form>
      <p>¿No tienes cuenta? <a href="/register">Registrate</a></p>
    </div>
  );
}
