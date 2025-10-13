// src/pages/Scan.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  validarToken,
  buscarEmpleadoPorLegajo,
  registrarAsistenciaPorLegajo,
  registrarNuevoEmpleado
} from "../utils/asistencia";

export default function Scan() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("token") || null;

  const [legajo, setLegajo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState(null);
  const [showRegistro, setShowRegistro] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", apellido: "", lugarTrabajo: "" });

  useEffect(() => {
    // Validamos token en cuanto entra la pantalla (opcional; si no hay token lo dejamos pasar)
    async function v() {
      if (!tokenParam) {
        setMessage("Advertencia: QR sin token. Proceda con precaución.");
        return;
      }
      try {
        await validarToken(tokenParam);
        setMessage("QR válido. Ingrese su legajo.");
      } catch (err) {
        setMessage(err.message || "Token inválido.");
      }
    }
    v();
  }, [tokenParam]);

  async function handleBuscar(e) {
    e && e.preventDefault();
    setMessage("");
    if (!legajo) {
      setMessage("Ingrese su legajo.");
      return;
    }
    setLoading(true);
    try {
      const emp = await buscarEmpleadoPorLegajo(legajo);
      if (!emp) {
        setEmpleadoEncontrado(null);
        setShowRegistro(true);
        setMessage("Empleado no encontrado. Complete el registro.");
      } else {
        setEmpleadoEncontrado(emp);
        setShowRegistro(false);
        setMessage(`Empleado encontrado: ${emp.nombre} ${emp.apellido}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("Ocurrió un error al buscar el empleado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegistrarAsistencia(tipo = null) {
    // si no hay empleado en memoria, buscarlo antes
    setMessage("");
    setLoading(true);
    try {
      let emp = empleadoEncontrado;
      if (!emp) {
        emp = await buscarEmpleadoPorLegajo(legajo);
        if (!emp) throw new Error("Empleado no encontrado. Por favor registrese.");
      }

      const res = await registrarAsistenciaPorLegajo(legajo, tokenParam);
      setMessage(`✅ Registro exitoso: ${res.empleado.nombre} ${res.empleado.apellido} - ${res.tipo} ${res.hora}`);
      // limpiar
      setLegajo("");
      setEmpleadoEncontrado(null);
      setShowRegistro(false);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Ocurrió un error al registrar la asistencia.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardarNuevo(e) {
    e && e.preventDefault();
    if (!legajo || !nuevo.nombre || !nuevo.apellido) {
      setMessage("Complete todos los campos para registrar empleado.");
      return;
    }
    setLoading(true);
    try {
      await registrarNuevoEmpleado({
        legajo,
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        lugarTrabajo: nuevo.lugarTrabajo || ""
      });
      setMessage("Empleado registrado. Proceda a fichar.");
      setShowRegistro(false);
      setEmpleadoEncontrado({ legajo, nombre: nuevo.nombre, apellido: nuevo.apellido, lugarTrabajo: nuevo.lugarTrabajo });
      // opcional: registrar asistencia inmediatamente
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
          <label>Legajo:
            <input value={legajo} onChange={(e) => setLegajo(e.target.value)} />
          </label>
          <br />
          <button type="submit" disabled={loading}>{loading ? "Buscando..." : "Buscar / Fichar"}</button>
        </form>
      )}

      {empleadoEncontrado && (
        <div style={{ marginTop: 16 }}>
          <h3>{empleadoEncontrado.nombre} {empleadoEncontrado.apellido}</h3>
          <p>Legajo: {empleadoEncontrado.legajo}</p>
          <p>Lugar de trabajo: {empleadoEncontrado.lugarTrabajo}</p>
          <button onClick={() => handleRegistrarAsistencia()} disabled={loading}>
            {loading ? "Registrando..." : "Registrar asistencia"}
          </button>
        </div>
      )}

      {showRegistro && (
        <form onSubmit={handleGuardarNuevo} style={{ marginTop: 12 }}>
          <h3>Registro de nuevo empleado</h3>
          <input placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} />
          <input placeholder="Apellido" value={nuevo.apellido} onChange={e => setNuevo({...nuevo, apellido: e.target.value})} />
          <input placeholder="Lugar de trabajo (opcional)" value={nuevo.lugarTrabajo} onChange={e => setNuevo({...nuevo, lugarTrabajo: e.target.value})} />
          <div style={{ marginTop: 8 }}>
            <button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar y fichar"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
