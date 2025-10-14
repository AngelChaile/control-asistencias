import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Admin from "./pages/Admin";
import Scan from "./pages/Scan";
import HR from "./pages/HR";
import Login from "./pages/Login";
import { auth, onAuthStateChanged, firebaseSignOut } from "./firebase";
import { getUserDoc } from "./utils/auth";
import Menu from "./components/Menu";

export default function App() {
  const [user, setUser] = useState(null); // user doc from "users" collection or null
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      // load user doc from Firestore "users/{uid}"
      try {
        const userDoc = await getUserDoc(u.uid);
        if (userDoc) {
          setUser({ uid: u.uid, ...userDoc });
        } else {
          // no user doc found, set minimal
          setUser({ uid: u.uid, email: u.email, rol: "admin", nombre: u.email });
        }
      } catch (err) {
        console.error("Error cargando user doc:", err);
        setUser(null);
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

  // while auth initializing, show nothing small (avoids flicker)
  if (!authReady) return <div style={{ padding: 20 }}>Cargando...</div>;

  return (
    <BrowserRouter>
      {/* show menu only for admin/rrhh (no menu for plain empleados or not logged) */}
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
              <div style={{ padding: 20 }}>
                <h2>Bienvenido al sistema de asistencias</h2>
              </div>
            )
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={user ? <Admin user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/hr" element={user ? <HR user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="*" element={<div style={{ padding: 20 }}><h2>Página no encontrada</h2></div>} />
      </Routes>
    </BrowserRouter>
  );
}
