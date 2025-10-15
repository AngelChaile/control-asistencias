// src/pages/Scan.jsx
import React, { useState, useEffect } from "react";
import { registrarAsistenciaPorLegajo } from "../utils/asistencia.js";
import { obtenerUsuarioActual } from "../utils/auth.js";

export default function Scan() {
  const [user, setUser] = useState(null);
  const [legajo, setLegajo] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarUsuario() {
      const u = await obtenerUsuarioActual();
      if (!u) {
        window.location.href = "/login";
        return;
      }
      setUser(u);
    }
    cargarUsuario();
  }, []);

  async function fichar(e) {
    e.preventDefault();
    if (!legajo) return setMensaje("Ingrese un legajo válido.");

    try {
      const res = await registrarAsistenciaPorLegajo(legajo);
      setMensaje(`✅ ${res.empleado.nombre} ${res.empleado.apellido} registró ${res.tipo}`);
      setLegajo("");
    } catch (err) {
      setMensaje(`❌ ${err.message}`);
    }
  }

  if (!user) return null; // evita render antes de validar usuario

  return (
    <div style={{ padding: 20 }}>
      <h2>Fichaje de Asistencias</h2>
      <form onSubmit={fichar}>
        <input
          type="text"
          placeholder="Ingrese legajo"
          value={legajo}
          onChange={(e) => setLegajo(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button type="submit">Registrar</button>
      </form>
      {mensaje && <p style={{ marginTop: 12 }}>{mensaje}</p>}
    </div>
  );
}
