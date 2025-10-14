import React from "react";
import { Link } from "react-router-dom";

/**
 * Menu dinámico según rol:
 * - rrhh: Inicio - Scan - Asistencias - Empleados - Usuarios - Reportes
 * - admin: Inicio - Scan - Asistencias - Empleados (su área)
 */

export default function Menu({ user, onLogout }) {
  const rol = user?.rol || "";

  return (
    <div style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #ddd", alignItems: "center" }}>
      <Link to="/">Inicio</Link>
      <Link to="/scan">Scan</Link>

      {rol === "rrhh" && (
        <>
          <Link to="/hr">Asistencias</Link>
          <Link to="/admin">Empleados</Link>
          <Link to="/admin">Usuarios</Link>
          <Link to="/admin">Reportes</Link>
        </>
      )}

      {rol === "admin" && (
        <>
          <Link to="/admin">Asistencias</Link>
          <Link to="/admin">Empleados</Link>
        </>
      )}

      <div style={{ marginLeft: "auto" }}>
        <strong>{user?.email || user?.nombre || ""}</strong>
        {onLogout && <button onClick={onLogout} style={{ marginLeft: 8 }}>Salir</button>}
      </div>
    </div>
  );
}
