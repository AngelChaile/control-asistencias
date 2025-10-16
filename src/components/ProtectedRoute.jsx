import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, allowedRoles = [], children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    // Si el usuario no tiene el rol permitido, lo enviamos a su dashboard
    if (user.rol === "rrhh") return <Navigate to="/rrhh" replace />;
    if (user.rol === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
