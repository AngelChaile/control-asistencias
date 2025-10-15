import React from "react";

export default function Menu({ user, onChangeView }) {
  return (
    <div
      style={{
        background: "#333",
        color: "#fff",
        padding: "10px 15px",
        borderRadius: 8,
      }}
    >
      <span style={{ marginRight: 15 }}>👤 {user.email}</span>
      <button onClick={() => onChangeView("asistencias")}>📋 Asistencias</button>
      <button onClick={() => onChangeView("empleados")} style={{ marginLeft: 8 }}>
        👥 Empleados
      </button>
      <button
        onClick={() => {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }}
        style={{ float: "right", background: "#c00", color: "#fff" }}
      >
        🚪 Salir
      </button>
    </div>
  );
}
