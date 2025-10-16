import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/Auth/Login";
import Fichar from "./pages/Empleado/Fichar";

// RRHH Pages
import HomeRRHH from "./pages/RRHH/HomeRRHH";
import Ausencias from "./pages/RRHH/Ausencias";
import Empleados from "./pages/RRHH/Empleados";
import Usuarios from "./pages/RRHH/Usuarios";
import Reportes from "./pages/RRHH/Reportes";
import QRPage from "./pages/RRHH/QRGenerator";

// Admin Pages
import HomeAdmin from "./pages/Admin/HomeAdmin";
import EmpleadosAdmin from "./pages/Admin/EmpleadosAdmin";
import AsistenciasAdmin from "./pages/Admin/AsistenciasAdmin";
import AusenciasAdmin from "./pages/Admin/AusenciasAdmin";
import ReportesAdmin from "./pages/Admin/ReportesAdmin";

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;
  return (
    <>
      {user && <Navbar user={user} onLogout={() => window.location.reload()} />}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

        {/* Empleado */}
        <Route path="/scan" element={<ProtectedRoute roles={["empleado"]}><Fichar /></ProtectedRoute>} />

        {/* RRHH */}
        <Route path="/rrhh/home" element={<ProtectedRoute roles={["rrhh"]}><HomeRRHH /></ProtectedRoute>} />
        <Route path="/rrhh/ausencias" element={<ProtectedRoute roles={["rrhh"]}><Ausencias /></ProtectedRoute>} />
        <Route path="/rrhh/empleados" element={<ProtectedRoute roles={["rrhh"]}><Empleados /></ProtectedRoute>} />
        <Route path="/rrhh/usuarios" element={<ProtectedRoute roles={["rrhh"]}><Usuarios /></ProtectedRoute>} />
        <Route path="/rrhh/reportes" element={<ProtectedRoute roles={["rrhh"]}><Reportes /></ProtectedRoute>} />
        <Route path="/rrhh/qr" element={<ProtectedRoute roles={["rrhh"]}><QRPage user={user} /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/home" element={<ProtectedRoute roles={["admin"]}><HomeAdmin /></ProtectedRoute>} />
        <Route path="/admin/empleados" element={<ProtectedRoute roles={["admin"]}><EmpleadosAdmin /></ProtectedRoute>} />
        <Route path="/admin/asistencias" element={<ProtectedRoute roles={["admin"]}><AsistenciasAdmin /></ProtectedRoute>} />
        <Route path="/admin/ausencias" element={<ProtectedRoute roles={["admin"]}><AusenciasAdmin /></ProtectedRoute>} />
        <Route path="/admin/reportes" element={<ProtectedRoute roles={["admin"]}><ReportesAdmin /></ProtectedRoute>} />

        <Route path="/" element={user ? <Navigate to={user.rol === "rrhh" ? "/rrhh/home" : user.rol === "admin" ? "/admin/home" : "/scan"} /> : <Navigate to="/login" />} />
        <Route path="*" element={<div style={{ padding: 20 }}><h2>Página no encontrada</h2></div>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
