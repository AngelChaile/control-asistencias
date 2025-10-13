import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { validarToken, registrarAsistencia } from "../utils/asistencia";

export default function Scan() {
  const [searchParams] = useSearchParams();
  const [legajo, setLegajo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const tokenParam = searchParams.get("token");
  const area = searchParams.get("area");

  useEffect(() => {
    if (!tokenParam || !area) {
      setMessage("Token o área inválida.");
    }
  }, [tokenParam, area]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      // 1) validar token
      const tokenData = await validarToken(tokenParam, area);

      // 2) registrar asistencia
      const res = await registrarAsistencia(legajo, tokenData.id, area);

      setMessage(
        `Registro aprobado: Legajo ${res.asistencia.legajo} - ${res.asistencia.apellido}, ${res.asistencia.nombre} - ${res.asistencia.tipo}`
      );
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Registro de Asistencia</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Ingresá tu Legajo:
          <input
            type="text"
            value={legajo}
            onChange={(e) => setLegajo(e.target.value)}
            required
          />
        </label>
        <br />
        <button type="submit" disabled={loading}>
          {loading ? "Registrando..." : "Fichar"}
        </button>
      </form>
    </div>
  );
}
