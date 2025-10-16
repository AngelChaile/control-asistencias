import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  return (
    <nav style={{ padding: 10, background: "#007bff", color: "#fff" }}>
      <span style={{ marginRight: 20 }}>Bienvenido, {user.nombre}</span>
      {user.rol === "rrhh" && (
        <>
          <Link to="/rrhh/home" style={{ marginRight: 10, color: "#fff" }}>Inicio</Link>
          <Link to="/rrhh/ausencias" style={{ marginRight: 10, color: "#fff" }}>Ausencias</Link>
          <Link to="/rrhh/empleados" style={{ marginRight: 10, color: "#fff" }}>Empleados</Link>
          <Link to="/rrhh/usuarios" style={{ marginRight: 10, color: "#fff" }}>Usuarios</Link>
          <Link to="/rrhh/reportes" style={{ marginRight: 10, color: "#fff" }}>Reportes</Link>
          <Link to="/rrhh/qr" style={{ marginRight: 10, color: "#fff" }}>QR</Link>
        </>
      )}
      {user.rol === "admin" && (
        <>
          <Link to="/admin/home" style={{ marginRight: 10, color: "#fff" }}>Inicio</Link>
          <Link to="/admin/empleados" style={{ marginRight: 10, color: "#fff" }}>Empleados</Link>
          <Link to="/admin/asistencias" style={{ marginRight: 10, color: "#fff" }}>Asistencias</Link>
          <Link to="/admin/ausencias" style={{ marginRight: 10, color: "#fff" }}>Ausencias</Link>
          <Link to="/admin/reportes" style={{ marginRight: 10, color: "#fff" }}>Reportes</Link>
        </>
      )}
      {user.rol === "empleado" && <Link to="/scan" style={{ marginRight: 10, color: "#fff" }}>Fichar</Link>}
      <button onClick={onLogout} style={{ marginLeft: 20 }}>Cerrar sesión</button>
    </nav>
  );
}
