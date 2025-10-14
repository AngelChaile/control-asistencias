// src/components/Navbar.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ user, logout }) {
  return (
    <nav
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
        borderBottom: "1px solid #ddd",
        alignItems: "center"
      }}
    >
      <Link to="/">Inicio</Link>
      <Link to="/admin">Admin</Link>
      <Link to="/scan">Scan</Link>
      <Link to="/hr">RRHH</Link>

      {user ? (
        <span style={{ marginLeft: "auto" }}>
          <strong>{user.email}</strong>{" "}
          <button onClick={logout}>Salir</button>
        </span>
      ) : (
        <Link to="/login" style={{ marginLeft: "auto" }}>
          Login
        </Link>
      )}
    </nav>
  );
}
