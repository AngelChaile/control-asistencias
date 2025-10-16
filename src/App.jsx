import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth, onAuthStateChanged, firebaseSignOut } from "./firebase";
import { getUserDoc } from "./utils/auth";

// 🔹 Componentes
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// 🔹 Páginas RRHH
import HomeRRHH from "./pages/RRHH/HomeRRHH";
import EmpleadosRRHH from "./pages/RRHH/Empleados";
import AusenciasRRHH from "./pages/RRHH/Ausencias";
import Usuarios from "./pages/RRHH/Usuarios";
import ReportesRRHH from "./pages/RRHH/Reportes";
import QRGenerator from "./pages/RRHH/QRGenerator";

// 🔹 Páginas Admin de área
import HomeAdmin from "./pages/Admin/HomeAdmin";
import EmpleadosAdmin from "./pages/Admin/Empleados";
import AsistenciasAdmin from "./pages/Admin/Asistencias";
import AusenciasAdmin from "./pages/Admin/Ausencias";
import ReportesAdmin from "./pages/Admin/Reportes";

// 🔹 Páginas públicas y login
import Scan from "./pages/Public/Scan";
import Login from "./pages/Auth/Login";

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const userDoc = await getUserDoc(u.uid);
        if (userDoc) setUser({ uid: u.uid, ...userDoc });
      } catch (err) {
        console.error("Error cargando user doc:", err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  async function logout() {
    await firebaseSignOut(auth);
    setUser(null);
  }

  if (!authReady) return <div style={{ padding: 20 }}>Cargando...</div>;

  return (
    <BrowserRouter>
      {/* 🔹 Menú general: solo visible si hay usuario logueado y no es empleado */}
      {user && user.rol !== "empleado" && <Navbar user={user} onLogout={logout} />}

      <Routes>
        {/* 🔹 Ruta pública: los empleados escanean el QR */}
        <Route path="/scan" element={<Scan />} />

        {/* 🔹 Login */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" replace />}
        />

        {/* 🔹 Redirección raíz según rol */}
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.rol === "rrhh" ? (
              <Navigate to="/rrhh" replace />
            ) : user.rol === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/scan" replace />
            )
          }
        />

        {/* ===========================
           🔹 RUTAS RRHH
        =========================== */}
        <Route
          path="/rrhh"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <HomeRRHH user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/empleados"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <EmpleadosRRHH user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/ausencias"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <AusenciasRRHH user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/usuarios"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <Usuarios user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/reportes"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <ReportesRRHH user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/scan"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <QRGenerator user={user} />
            </ProtectedRoute>
          }
        />

        {/* ===========================
           🔹 RUTAS ADMIN
        =========================== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <HomeAdmin user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/empleados"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <EmpleadosAdmin user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/asistencias"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <AsistenciasAdmin user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ausencias"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <AusenciasAdmin user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reportes"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <ReportesAdmin user={user} />
            </ProtectedRoute>
          }
        />

        {/* 🔹 Página no encontrada */}
        <Route
          path="*"
          element={<div style={{ padding: 20 }}>Página no encontrada</div>}
        />
      </Routes>
    </BrowserRouter>
  );
}
