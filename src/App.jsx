// src/App.jsx
import React, { useEffect, useState, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth, onAuthStateChanged, firebaseSignOut } from "./firebase";
import { getUserDoc } from "./utils/auth";

// 🔹 Componentes
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

// 🔹 Páginas RRHH (lazy-loaded)
const HomeRRHH = lazy(() => import("./pages/RRHH/HomeRRHH"));
const EmpleadosRRHH = lazy(() => import("./pages/RRHH/Empleados"));
const AusenciasRRHH = lazy(() => import("./pages/RRHH/Ausencias"));
const Usuarios = lazy(() => import("./pages/RRHH/Usuarios"));
const QRGenerator = lazy(() => import("./pages/RRHH/QRGenerator"));
const ReportesRRHH = lazy(() => import("./pages/RRHH/Reportes"));

// 🔹 NUEVAS PÁGINAS RRHH - Sistema de Traspasos
const DashboardAnalisis = lazy(() => import("./pages/RRHH/DashboardAnalisis"));
const GestionSolicitudes = lazy(() => import("./pages/RRHH/GestionSolicitudes"));
const EmpleadosDisponibles = lazy(() => import("./pages/RRHH/EmpleadosDisponibles"));

// 🔹 Páginas Admin (lazy-loaded)
const HomeAdmin = lazy(() => import("./pages/Admin/HomeAdmin"));
const AsistenciasAdmin = lazy(() => import("./pages/Admin/AsistenciasAdmin"));
const AusenciasAdmin = lazy(() => import("./pages/Admin/AusenciasAdmin"));
const EmpleadosAdmin = lazy(() => import("./pages/Admin/EmpleadosAdmin"));
const ReportesAdmin = lazy(() => import("./pages/Admin/ReportesAdmin"));

// 🔹 NUEVAS PÁGINAS ADMIN - Sistema de Traspasos
const SolicitudTraspaso = lazy(() => import("./pages/Admin/SolicitudTraspaso"));
const MisSolicitudes = lazy(() => import("./pages/Admin/MisSolicitudes"));

// 🔹 Públicas y login (lazy)
const Scan = lazy(() => import("./pages/Public/Scan"));
const Login = lazy(() => import("./pages/Auth/Login"));

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const { setUser: setContextUser } = useAuth();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setContextUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const userDoc = await getUserDoc(u.uid);
        if (userDoc) {
          const full = { uid: u.uid, ...userDoc };
          setUser(full);
          setContextUser(full);
        }
      } catch (err) {
        console.error("Error cargando user doc:", err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [setContextUser]);

  async function logout() {
    await firebaseSignOut(auth);
    setUser(null);
    setContextUser(null);
  }

  if (!authReady) return <div style={{ padding: 20 }}>Cargando...</div>;

  // 🔥 FUNCIÓN PARA REDIRECCIÓN SEGURA
  const getRedirectPath = () => {
    if (!user) return "/login";
    
    // Mapeo de roles a rutas
    const roleRoutes = {
      'rrhh': '/rrhh',
      'subsecretario': '/rrhh/',
      'admin': '/admin',
      'empleado': '/scan'
    };
    
    return roleRoutes[user.rol] || '/login';
  };

  return (
    <BrowserRouter>
      {/* Navbar: mostramos para todos los roles excepto empleado */}
      {user && user.rol !== "empleado" && <Navbar />}

      <Suspense fallback={<div className="p-6">Cargando...</div>}>
        <Routes>
          {/* ===========================
               🔹 RUTAS PÚBLICAS
          =========================== */}
          <Route path="/scan" element={<Scan />} />
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to={getRedirectPath()} replace />}
          />

          {/* ===========================
               🔹 REDIRECCIÓN RAÍZ
          =========================== */}
          <Route
            path="/"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : (
                <Navigate to={getRedirectPath()} replace />
              )
            }
          />

{/* ===========================
     🔹 RUTAS RRHH (Ahora accesibles para RRHH y Subsecretario)
=========================== */}
<Route
  path="/rrhh"
  element={
    <ProtectedRoute user={user} allowedRoles={["rrhh", "subsecretario"]}>
      <HomeRRHH />
    </ProtectedRoute>
  }
/>
<Route
  path="/rrhh/empleados"
  element={
    <ProtectedRoute user={user} allowedRoles={["rrhh", "subsecretario"]}>
      <EmpleadosRRHH />
    </ProtectedRoute>
  }
/>
<Route
  path="/rrhh/ausencias"
  element={
    <ProtectedRoute user={user} allowedRoles={["rrhh", "subsecretario"]}>
      <AusenciasRRHH />
    </ProtectedRoute>
  }
/>
<Route
  path="/rrhh/reportes"
  element={
    <ProtectedRoute user={user} allowedRoles={["rrhh", "subsecretario"]}>
      <ReportesRRHH />
    </ProtectedRoute>
  }
/>
<Route
  path="/rrhh/usuarios"
  element={
    <ProtectedRoute user={user} allowedRoles={["rrhh"]}> {/* ⚠️ SOLO RRHH */}
      <Usuarios />
    </ProtectedRoute>
  }
/>
<Route
  path="/rrhh/qr"
  element={
    <ProtectedRoute user={user} allowedRoles={["rrhh"]}> {/* ⚠️ SOLO RRHH */}
      <QRGenerator />
    </ProtectedRoute>
  }
/>

          {/* 🔹 NUEVAS RUTAS RRHH - Sistema de Traspasos */}
          <Route
            path="/rrhh/dashboard-analisis"
            element={
              <ProtectedRoute user={user} allowedRoles={["rrhh", "subsecretario"]}>
                <DashboardAnalisis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rrhh/gestion-solicitudes"
            element={
              <ProtectedRoute user={user} allowedRoles={["rrhh", "subsecretario"]}>
                <GestionSolicitudes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rrhh/empleados-disponibles"
            element={
              <ProtectedRoute user={user} allowedRoles={["rrhh", "subsecretario"]}>
                <EmpleadosDisponibles />
              </ProtectedRoute>
            }
          />

          {/* ===========================
           🔹 RUTAS PARA SUBSECRETARIO (Alias a RRHH)
            =========================== */}
          <Route
            path="/subsecretario/*"
            element={
              <ProtectedRoute user={user} allowedRoles={["subsecretario"]}>
                {/* Redirige todo lo que esté en /subsecretario/* a /rrhh/* */}
                <Navigate to={`/rrhh/${location.pathname.split('/').slice(2).join('/')}`} replace />
              </ProtectedRoute>
            }
          />

          {/* 🔹 NUEVAS RUTAS ADMIN */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <HomeAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/empleados"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <EmpleadosAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/asistencias"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <AsistenciasAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ausencias"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <AusenciasAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reportes"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <ReportesAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qr"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <QRGenerator />
              </ProtectedRoute>
            }
          />

          {/* 🔹 NUEVAS RUTAS ADMIN - Sistema de Traspasos */}
          <Route
            path="/admin/solicitar-traspaso"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <SolicitudTraspaso />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mis-solicitudes"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <MisSolicitudes />
              </ProtectedRoute>
            }
          />

          {/* Página no encontrada */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                  <p className="text-gray-600">Página no encontrada</p>
                  <button 
                    onClick={() => window.location.href = getRedirectPath()}
                    className="mt-4 btn-primary"
                  >
                    Volver al inicio
                  </button>
                </div>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}