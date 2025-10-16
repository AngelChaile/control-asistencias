// src/pages/Scan.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  validarToken,
  buscarEmpleadoPorLegajo,
  registrarAsistenciaPorLegajo,
  registrarNuevoEmpleado,
} from "../../utils/asistencia";

export default function Scan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenParam = searchParams.get("token") || null;

  const [legajo, setLegajo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const [showRegistro, setShowRegistro] = useState(false);
  const [tokenValido, setTokenValido] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", apellido: "", lugarTrabajo: "" });
  const [bloqueado, setBloqueado] = useState(false); // 🔒 evita trampas

  useEffect(() => {
    (async () => {
      if (!tokenParam) {
        setMessage("❌ Acceso no permitido. Escanee un QR válido para fichar.");
        return;
      }
      try {
        await validarToken(tokenParam);
        setTokenValido(true);
        setMessage("✅ QR válido. Ingrese su legajo para fichar.");
      } catch (err) {
        setTokenValido(false);
        setMessage(err.message || "⏰ Este QR ya no es válido.");
      }
    })();
  }, [tokenParam]);

  async function handleBuscar(e) {
    e.preventDefault();
    if (!tokenValido) return setMessage("⏰ Este QR ya caducó. Solicite uno nuevo.");
    if (!legajo) return setMessage("Ingrese su legajo para continuar.");
    setLoading(true);
    try {
      const emp = await buscarEmpleadoPorLegajo(legajo);
      if (!emp) {
        setShowRegistro(true);
        setEmpleado(null);
        setMessage("Empleado no encontrado. Complete el registro.");
      } else {
        setEmpleado(emp);
        setShowRegistro(false);
        setMessage(`Empleado encontrado: ${emp.nombre} ${emp.apellido}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Error al buscar el empleado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegistrarAsistencia() {
    if (!tokenValido) return setMessage("⏰ Este QR ya caducó. Solicite uno nuevo.");
    setLoading(true);
    try {
      const res = await registrarAsistenciaPorLegajo(legajo, tokenParam);
      setMessage(`✅ ${res.empleado.nombre} ${res.empleado.apellido} registró ${res.tipo} a las ${res.hora}.`);
      setBloqueado(true); // 🔒 Bloquear input para evitar segunda fichada
      setShowRegistro(false);
    } catch (err) {
      setMessage(err.message || "Error al registrar la asistencia.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardarNuevo(e) {
    e.preventDefault();
    if (!tokenValido) return setMessage("⏰ Este QR ya caducó. Solicite uno nuevo.");
    if (!legajo || !nuevo.nombre || !nuevo.apellido)
      return setMessage("Complete todos los campos para registrarse.");
    setLoading(true);
    try {
      await registrarNuevoEmpleado({
        legajo,
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        lugarTrabajo: nuevo.lugarTrabajo || "",
      });
      setMessage("✅ Empleado registrado correctamente. Fichando...");
      setShowRegistro(false);
      setEmpleado({
        legajo,
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        lugarTrabajo: nuevo.lugarTrabajo,
      });
      await handleRegistrarAsistencia();
    } catch (err) {
      console.error(err);
      setMessage("Error guardando nuevo empleado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "auto" }}>
      <h2>Registro de Asistencia</h2>
      <p>{message}</p>

      {!showRegistro && (
        <form onSubmit={handleBuscar}>
          <label>
            Legajo:
            <input
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              disabled={bloqueado || !tokenValido}
              placeholder="Ingrese su legajo"
            />
          </label>
          <div style={{ marginTop: 8 }}>
            <button type="submit" disabled={loading || !tokenValido || bloqueado}>
              {loading ? "Buscando..." : "Buscar / Fichar"}
            </button>
            <button type="button" onClick={() => navigate("/login")} style={{ marginLeft: 8 }}>
              Volver al login
            </button>
          </div>
        </form>
      )}

      {empleado && (
        <div style={{ marginTop: 16 }}>
          <h3>{empleado.nombre} {empleado.apellido}</h3>
          <p>Legajo: {empleado.legajo}</p>
          <p>Lugar: {empleado.lugarTrabajo}</p>
          <button onClick={handleRegistrarAsistencia} disabled={loading || !tokenValido || bloqueado}>
            {loading ? "Registrando..." : "Registrar asistencia"}
          </button>
        </div>
      )}

      {showRegistro && (
        <form onSubmit={handleGuardarNuevo} style={{ marginTop: 12 }}>
          <h3>Registro de nuevo empleado</h3>
          <input placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <input placeholder="Apellido" value={nuevo.apellido} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} />
          <input placeholder="Lugar de trabajo" value={nuevo.lugarTrabajo} onChange={(e) => setNuevo({ ...nuevo, lugarTrabajo: e.target.value })} />
          <div style={{ marginTop: 8 }}>
            <button type="submit" disabled={loading || !tokenValido}>
              {loading ? "Guardando..." : "Guardar y fichar"}
            </button>
            <button type="button" onClick={() => navigate("/login")} style={{ marginLeft: 8 }}>
              Volver al login
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
