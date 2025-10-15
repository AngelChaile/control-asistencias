import React from "react";
import { Link } from "react-router-dom";

/**
 * Menu dinámico según rol:
 * - rrhh: Inicio - Scan - Asistencias - Empleados - Usuarios - Reportes
 * - admin: Inicio - Scan - Asistencias - Empleados (su área)
 * - empleado: no ve menú
 */

export default function Menu({ user, onLogout }) {
  if (!user || user.rol === "empleado") return null; // no mostrar menú para empleados

  const rol = user?.rol || "";

  return (
    <nav
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
        borderBottom: "1px solid #ddd",
        alignItems: "center",
        backgroundColor: "#f8f8f8",
      }}
    >
      <Link to="/">Inicio</Link>
      <Link to="/scan">Scan</Link>

      {rol === "rrhh" && (
        <>
          <Link to="/asistencias">Asistencias</Link>
          <Link to="/empleados">Empleados</Link>
          <Link to="/usuarios">Usuarios</Link>
          <Link to="/reportes">Reportes</Link>
        </>
      )}

      {rol === "admin" && (
        <>
          <Link to="/asistencias">Asistencias</Link>
          <Link to="/empleados">Empleados</Link>
        </>
      )}

      <div style={{ marginLeft: "auto" }}>
        <strong>{user?.nombre || user?.email}</strong>
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              marginLeft: 8,
              padding: "4px 10px",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            Salir
          </button>
        )}
      </div>
    </nav>
  );
}
