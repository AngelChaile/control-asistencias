// src/pages/Scan.jsx
import React, { useState } from "react";
import {
  buscarEmpleadoPorLegajo,
  registrarAsistencia,
  registrarNuevoEmpleado,
} from "../utils/asistencia";

export default function Scan() {
  const [legajo, setLegajo] = useState("");
  const [empleado, setEmpleado] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: "",
    apellido: "",
    area: "",
    dni: "",
  });

  const handleBuscar = async () => {
    if (!legajo) {
      setMensaje("Por favor ingrese su legajo.");
      return;
    }

    try {
      const emp = await buscarEmpleadoPorLegajo(legajo);
      if (emp) {
        await registrarAsistencia(emp);
        setMensaje(`✅ Asistencia registrada para ${emp.nombre} ${emp.apellido}`);
      } else {
        setMensaje("⚠️ Empleado no encontrado. Complete sus datos para registrarse:");
        setEmpleado(null);
      }
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al registrar la asistencia.");
    }
  };

  const handleGuardarNuevo = async () => {
    if (!nuevoEmpleado.nombre || !nuevoEmpleado.apellido || !nuevoEmpleado.area || !nuevoEmpleado.dni) {
      setMensaje("Por favor complete todos los campos.");
      return;
    }

    try {
      const nuevo = { ...nuevoEmpleado, legajo };
      await registrarNuevoEmpleado(nuevo);
      await registrarAsistencia(nuevo);
      setMensaje(`✅ Empleado registrado y asistencia guardada para ${nuevo.nombre} ${nuevo.apellido}.`);
      setNuevoEmpleado({ nombre: "", apellido: "", area: "", dni: "" });
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al guardar el nuevo empleado.");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: "auto" }}>
      <h2>Registro de Asistencia</h2>
      <input
        type="text"
        placeholder="Ingrese su legajo"
        value={legajo}
        onChange={(e) => setLegajo(e.target.value)}
      />
      <button onClick={handleBuscar}>Buscar / Registrar</button>

      <p>{mensaje}</p>

      {mensaje.includes("Complete sus datos") && (
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="Nombre"
            value={nuevoEmpleado.nombre}
            onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })}
          />
          <input
            type="text"
            placeholder="Apellido"
            value={nuevoEmpleado.apellido}
            onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, apellido: e.target.value })}
          />
          <input
            type="text"
            placeholder="Área"
            value={nuevoEmpleado.area}
            onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, area: e.target.value })}
          />
          <input
            type="text"
            placeholder="DNI"
            value={nuevoEmpleado.dni}
            onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, dni: e.target.value })}
          />
          <button onClick={handleGuardarNuevo}>Guardar Empleado</button>
        </div>
      )}
    </div>
  );
}
