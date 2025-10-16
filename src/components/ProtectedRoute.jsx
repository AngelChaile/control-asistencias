import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles.length > 0 && !roles.includes(user.rol)) return <Navigate to="/" replace />;
  return children;
}
