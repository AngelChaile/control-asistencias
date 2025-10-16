// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Admin from "./pages/Admin";
import Scan from "./pages/Scan";
import HR from "./pages/HR";
import Login from "./pages/Login";
import { auth, onAuthStateChanged, firebaseSignOut } from "./firebase";
import { getUserDoc } from "./utils/auth";
import Menu from "./components/Menu";

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const userDoc = await getUserDoc(u.uid);
        setUser(userDoc ? { uid: u.uid, ...userDoc } : { uid: u.uid, email: u.email, rol: "admin" });
      } catch (err) {
        console.error("Error cargando user doc:", err);
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 🔸 Cierre de sesión por inactividad (20 minutos)
  useEffect(() => {
    const timeout = setInterval(() => {
      if (user && Date.now() - lastActivity > 20 * 60 * 1000) {
        logout();
        alert("⚠️ Sesión cerrada por inactividad.");
      }
    }, 60 * 1000);

    const resetTimer = () => setLastActivity(Date.now());
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    return () => {
      clearInterval(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [user, lastActivity]);

  async function logout() {
    await firebaseSignOut(auth);
    setUser(null);
  }

  if (!authReady) return <div style={{ padding: 20 }}>Cargando...</div>;

  return (
    <BrowserRouter>
      {user && user.rol !== "empleado" && <Menu user={user} onLogout={logout} />}

      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.rol === "rrhh" ? (
              <Navigate to="/hr" replace />
            ) : user.rol === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/scan" replace />
            )
          }
        />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/admin" element={user ? <Admin user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/hr" element={user ? <HR user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="*" element={<div style={{ padding: 20 }}><h2>Página no encontrada</h2></div>} />
      </Routes>
    </BrowserRouter>
  );
}
