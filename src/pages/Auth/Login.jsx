// src/pages/Auth/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, signInWithEmailAndPassword } from "../../firebase";
import { getUserDoc } from "../../utils/auth";
import Swal from "sweetalert2";

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

      const userDoc = await getUserDoc(uid);
      if (!userDoc) throw new Error("No se pudo cargar la información del usuario.");

      // 🔹 Guardar usuario en localStorage para mostrar en el header luego
      localStorage.setItem("userData", JSON.stringify(userDoc));

      // 🔹 Redirigir según rol (sin SweetAlert)
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-gray-50 to-white">
      {/* Panel izquierdo */}
      <div className="hidden md:flex md:w-1/2 bg-municipio-500 text-white items-center justify-center p-10 flex-col">
        <h1 className="text-4xl font-bold mb-3">Sistema de Asistencia</h1>
        <p className="text-lg opacity-80 text-center max-w-sm">
          Accede al panel de control del municipio y gestiona la asistencia de forma moderna y eficiente.
        </p>
      </div>

      {/* Panel derecho (formulario) */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-municipio-500 text-white flex items-center justify-center text-2xl font-bold shadow-md">
              M
            </div>
            <h2 className="text-2xl font-semibold mt-4">Bienvenido</h2>
            <p className="text-gray-500 text-sm">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-municipio-400"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-municipio-400"
                placeholder="********"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg text-white font-semibold transition-all ${
                loading
                  ? "bg-municipio-400 opacity-80 cursor-not-allowed"
                  : "bg-municipio-500 hover:bg-municipio-600 shadow-md hover:shadow-lg"
              }`}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2025 Municipalidad - Sistema de Asistencia
          </p>
        </div>
      </div>
    </div>
  );
}
