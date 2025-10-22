// src/pages/Auth/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error("Error login:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Sistema de Asistencias</h2>
          <p className="mt-2 text-gray-600">Municipio - Ingresa a tu cuenta</p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="card p-8 space-y-6 shadow-xl">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-modern"
                placeholder="usuario@municipio.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 px-4 text-base font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Sistema seguro de gestión de asistencias
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}