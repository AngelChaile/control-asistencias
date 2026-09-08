// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, user, allowedRoles = [] }) {
  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario tiene un rol que no está en la lista permitida
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    // Redirigir según el rol
    const redirectMap = {
      'rrhh': '/rrhh',
      'subsecretario': '/rrhh/gestion-solicitudes',
      'admin': '/admin',
      'empleado': '/scan'
    };
    
    const redirectPath = redirectMap[user.rol] || '/login';
    return <Navigate to={redirectPath} replace />;
  }

  // Si todo está bien, mostrar el componente
  return children;
}