import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Admin from "./pages/Admin";
import Scan from "./pages/Scan";
import HR from "./pages/HR";
import Navbar from "./components/Navbar";
import { auth, signInWithEmailAndPassword, onAuthStateChanged, firebaseSignOut } from "./firebase";

function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  async function login() {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      setUser({ email: res.user.email });
    } catch (err) {
      alert("Error login: " + err.message);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} /><br />
      <input placeholder="password" type="password" value={pass} onChange={e => setPass(e.target.value)} /><br />
      <button onClick={login}>Ingresar</button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (u) setUser({ email: u.email });
      else setUser(null);
    });
    return () => unsub();
  }, []);

  async function logout() {
    await firebaseSignOut(auth);
    setUser(null);
  }

  return (
    <BrowserRouter>
      <Navbar user={user} logout={logout} />

      <Routes>
        <Route path="/" element={<div style={{ padding: 20 }}><h2>Bienvenido al sistema de asistencias</h2></div>} />
        <Route path="/admin" element={user ? <Admin user={user} /> : <Login setUser={setUser} />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/hr" element={user ? <HR /> : <Login setUser={setUser} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="*" element={<div style={{ padding: 20 }}><h2>Página no encontrada</h2></div>} />
      </Routes>
    </BrowserRouter>
  );
}
