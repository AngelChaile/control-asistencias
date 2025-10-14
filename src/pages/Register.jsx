import React, { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function Register() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");

  async function handleRegister(e) {
    e.preventDefault();

    try {
      await addDoc(collection(db, "solicitudes_registro"), {
        nombre,
        apellido,
        email,
        area,
        rol: "admin",
        estado: "pendiente",
        createdAt: serverTimestamp(),
      });

      alert("Solicitud enviada. RRHH validará tu registro y te enviará acceso.");
      setNombre("");
      setApellido("");
      setEmail("");
      setArea("");
    } catch (err) {
      alert("Error al enviar solicitud: " + err.message);
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Registro de Admin de Área</h2>
      <form onSubmit={handleRegister}>
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} />
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Área" value={area} onChange={(e) => setArea(e.target.value)} />
        <button type="submit">Enviar solicitud</button>
      </form>
    </div>
  );
}
