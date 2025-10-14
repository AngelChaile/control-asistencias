import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import HR from "./pages/HR";
import AdminArea from "./pages/AdminArea";
import Employee from "./pages/Employee";
import { obtenerUsuarioActual } from "./utils/auth";
import React, { useEffect, useState } from "react";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obtenerUsuarioActual().then((u) => {
      setUsuario(u);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {usuario?.rol === "rrhh" && <Route path="/rrhh" element={<HR />} />}
        {usuario?.rol === "admin" && <Route path="/admin-area" element={<AdminArea />} />}
        {usuario?.rol === "empleado" && <Route path="/empleado" element={<Employee />} />}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
