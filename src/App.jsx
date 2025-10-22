import React, { useEffect, useState, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth, onAuthStateChanged, firebaseSignOut } from "./firebase";
import { getUserDoc } from "./utils/auth";

// 🔹 Componentes
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext"; // <-- agregado

// 🔹 Páginas RRHH (lazy-loaded)
const HomeRRHH = lazy(() => import("./pages/RRHH/HomeRRHH"));
const EmpleadosRRHH = lazy(() => import("./pages/RRHH/Empleados"));
const AusenciasRRHH = lazy(() => import("./pages/RRHH/Ausencias"));
const Usuarios = lazy(() => import("./pages/RRHH/Usuarios"));
const QRGenerator = lazy(() => import("./pages/RRHH/QRGenerator"));
const ReportesRRHH = lazy(() => import("./pages/RRHH/Reportes"));

// 🔹 Páginas Admin (lazy-loaded)
const HomeAdmin = lazy(() => import("./pages/Admin/HomeAdmin"));
const AsistenciasAdmin = lazy(() => import("./pages/Admin/AsistenciasAdmin"));
const AusenciasAdmin = lazy(() => import("./pages/Admin/AusenciasAdmin"));
const EmpleadosAdmin = lazy(() => import("./pages/Admin/EmpleadosAdmin"));
const ReportesAdmin = lazy(() => import("./pages/Admin/ReportesAdmin"));

// 🔹 Públicas y login (lazy)
const Scan = lazy(() => import("./pages/Public/Scan"));
const Login = lazy(() => import("./pages/Auth/Login"));

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const { setUser: setContextUser } = useAuth(); // <-- sincronizar contexto

  // 🔹 Detectar cambios de auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setContextUser(null); // <-- mantener contexto en sync
        setAuthReady(true);
        return;
      }
      try {
        const userDoc = await getUserDoc(u.uid);
        if (userDoc) {
          const full = { uid: u.uid, ...userDoc };
          setUser(full);
          setContextUser(full); // <-- mantener contexto en sync
        }
      } catch (err) {
        console.error("Error cargando user doc:", err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [setContextUser]);

  // 🔹 Cerrar sesión
  async function logout() {
    await firebaseSignOut(auth);
    setUser(null);
    setContextUser(null); // <-- mantener contexto en sync
  }

  if (!authReady) return <div style={{ padding: 20 }}>Cargando...</div>;

  return (
    <BrowserRouter>
      {/* Navbar global según rol */}
      {user && user.rol !== "empleado" && <Navbar />}

      <Suspense fallback={<div className="p-6">Cargando...</div>}>
        <Routes>
        {/* Rutas públicas */}
        <Route path="/scan" element={<Scan />} />
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" replace />}
        />

        {/* Redirección raíz según rol */}
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
              <HomeRRHH />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/empleados"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <EmpleadosRRHH />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/ausencias"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <AusenciasRRHH />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/usuarios"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/qr"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <QRGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh/reportes"
          element={
            <ProtectedRoute user={user} allowedRoles={["rrhh"]}>
              <ReportesRRHH />
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

        {/* Página no encontrada */}
        <Route
          path="*"
          element={<div style={{ padding: 20 }}>Página no encontrada</div>}
        />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
