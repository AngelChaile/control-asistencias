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
        timer: 1500,
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          Iniciar Sesión
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            placeholder="tu@email.com"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            placeholder="********"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg text-white font-medium transition-colors ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
