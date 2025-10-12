// src/pages/Scan.jsx
import React, { useState } from "react";
import {
  buscarEmpleadoPorLegajo,
  registrarAsistencia,
  registrarNuevoEmpleado,
} from "../utils/asistencia";
import Swal from "sweetalert2";

export default function Scan() {
  const [legajo, setLegajo] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: "",
    apellido: "",
    email: "",
    horario: "",
    lugarTrabajo: "",
    secretaria: "",
  });

  const handleBuscar = async () => {
    if (!legajo.trim()) {
      Swal.fire("Atención", "Por favor ingrese su legajo.", "warning");
      return;
    }

    try {
      const empleado = await buscarEmpleadoPorLegajo(legajo);

      if (empleado) {
        const result = await registrarAsistencia(empleado);

        if (result.success) {
          Swal.fire(
            "✅ Asistencia registrada",
            `Bienvenido/a ${empleado.nombre} ${empleado.apellido}`,
            "success"
          );
          setLegajo("");
        } else {
          Swal.fire("Error", result.message, "error");
        }
      } else {
        Swal.fire(
          "Empleado no encontrado",
          "Complete sus datos para registrarse.",
          "info"
        );
        setMostrarFormulario(true);
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo registrar la asistencia.", "error");
    }
  };

  const handleGuardarNuevo = async () => {
    const { nombre, apellido, email, horario, lugarTrabajo, secretaria } = nuevoEmpleado;

    if (!nombre || !apellido || !email || !horario || !lugarTrabajo || !secretaria) {
      Swal.fire("Atención", "Complete todos los campos.", "warning");
      return;
    }

    try {
      const nuevo = { ...nuevoEmpleado, legajo, rol: "empleado" };
      const regEmp = await registrarNuevoEmpleado(nuevo);

      if (regEmp.success) {
        await registrarAsistencia(nuevo);
        Swal.fire(
          "✅ Registrado",
          `Empleado ${nuevo.nombre} ${nuevo.apellido} agregado y asistencia guardada.`,
          "success"
        );
        setNuevoEmpleado({
          nombre: "",
          apellido: "",
          email: "",
          horario: "",
          lugarTrabajo: "",
          secretaria: "",
        });
        setLegajo("");
        setMostrarFormulario(false);
      } else {
        Swal.fire("Error", regEmp.message, "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar el empleado.", "error");
    }
  };

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "60px auto",
        padding: 30,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        textAlign: "center",
      }}
    >
      <h2 style={{ marginBottom: 20, color: "#333" }}>Registro de Asistencia</h2>
      <input
        type="text"
        placeholder="Ingrese su legajo"
        value={legajo}
        onChange={(e) => setLegajo(e.target.value)}
        style={{
          padding: 10,
          width: "100%",
          marginBottom: 10,
          borderRadius: 8,
          border: "1px solid #ccc",
          outline: "none",
        }}
      />
      <button
        onClick={handleBuscar}
        style={{
          backgroundColor: "#1976d2",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: 8,
          cursor: "pointer",
          width: "100%",
        }}
      >
        Buscar / Registrar
      </button>

      {mostrarFormulario && (
        <div style={{ marginTop: 30, textAlign: "left" }}>
          <h3 style={{ textAlign: "center" }}>Nuevo Empleado</h3>

          {[
            { name: "nombre", placeholder: "Nombre" },
            { name: "apellido", placeholder: "Apellido" },
            { name: "email", placeholder: "Email" },
            { name: "horario", placeholder: "Horario (ej: 07:00 - 15:00)" },
            { name: "lugarTrabajo", placeholder: "Lugar de trabajo" },
            { name: "secretaria", placeholder: "Secretaría" },
          ].map((field) => (
            <input
              key={field.name}
              type="text"
              placeholder={field.placeholder}
              value={nuevoEmpleado[field.name]}
              onChange={(e) =>
                setNuevoEmpleado({ ...nuevoEmpleado, [field.name]: e.target.value })
              }
              style={{
                padding: 10,
                width: "100%",
                marginBottom: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                outline: "none",
              }}
            />
          ))}

          <button
            onClick={handleGuardarNuevo}
            style={{
              backgroundColor: "#2e7d32",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: 8,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Guardar Empleado
          </button>
        </div>
      )}
    </div>
  );
}
