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
      localStorage.setItem("userData", JSON.stringify(userDoc));

      if (userDoc.rol === "rrhh") navigate("/rrhh", { replace: true });
      else if (userDoc.rol === "admin") navigate("/admin", { replace: true });
      else navigate("/scan", { replace: true });

    } catch (error) {
      console.error("Error en login:", error);
      let mensaje = "Error al iniciar sesión.";
      if (error.code === "auth/invalid-email") mensaje = "El formato del correo no es válido.";
      else if (error.code === "auth/user-not-found") mensaje = "No existe una cuenta con ese correo.";
      else if (error.code === "auth/wrong-password") mensaje = "Contraseña incorrecta.";
      else if (error.code === "auth/too-many-requests") mensaje = "Demasiados intentos. Espera unos minutos e inténtalo nuevamente.";
      else if (error.message) mensaje = error.message;
      Swal.fire({ icon: "error", title: "Ups...", text: mensaje });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f6fb] via-white to-[#e8eefc]">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-xl bg-[#0f4c75] text-white flex items-center justify-center text-2xl font-bold shadow-md">
            M
          </div>
          <h1 className="text-2xl font-semibold mt-4 text-[#0f172a]">Bienvenido</h1>
          <p className="text-gray-500 text-sm mt-1">Accedé al sistema de asistencia</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base w-full focus:ring-2 focus:ring-[#0f4c75]"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base w-full focus:ring-2 focus:ring-[#0f4c75]"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-white font-semibold transition-all duration-200 ${
              loading
                ? "bg-[#0f4c75]/70 cursor-not-allowed"
                : "bg-gradient-to-r from-[#0f4c75] to-[#3282b8] hover:scale-[1.03] shadow-md"
            }`}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          © 2025 Municipalidad — Sistema de Asistencia
        </p>
      </div>
    </div>
  );
}
