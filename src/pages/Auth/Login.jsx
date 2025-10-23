// src/pages/Auth/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, signInWithEmailAndPassword } from "../../firebase";
import Swal from "sweetalert2";
import { getUserDoc } from "../../utils/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // 🔹 Obtener datos del usuario
      const userDoc = await getUserDoc(uid);
      if (!userDoc) throw new Error("No se pudo cargar la información del usuario.");

      // 🔹 Redirigir según rol
      Swal.fire({
        icon: "success",
        title: "¡Bienvenido!",
        text: `Hola ${userDoc.nombre} ${userDoc.apellido}`,
        timer: 800,
        showConfirmButton: false,
      });

      if (userDoc.rol === "rrhh") {
        navigate("/rrhh", { replace: true });
      } else if (userDoc.rol === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/scan", { replace: true });
      }

    } catch (error) {
      console.error("Error en login:", error);

      let mensaje = "Error al iniciar sesión.";
      if (error.code === "auth/invalid-email") mensaje = "El formato del correo no es válido.";
      else if (error.code === "auth/user-not-found") mensaje = "No existe una cuenta con ese correo.";
      else if (error.code === "auth/wrong-password") mensaje = "Contraseña incorrecta.";
      else if (error.code === "auth/too-many-requests") mensaje = "Demasiados intentos. Espera unos minutos e inténtalo nuevamente.";
      else if (error.message) mensaje = error.message;

      Swal.fire({
        icon: "error",
        title: "Ups...",
        text: mensaje,
      });
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
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100/60 p-8 space-y-6">
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm placeholder-gray-400"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
              © 2025 Municipalidad - Sistema seguro de gestión de asistencias
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}