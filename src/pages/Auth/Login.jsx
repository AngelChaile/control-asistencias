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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg,#f8fafc 0%, #ffffff 50%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-lg bg-municipio-500 text-white flex items-center justify-center text-2xl font-bold">M</div>
          <h1 className="text-2xl font-semibold mt-3">Bienvenido</h1>
          <p className="muted">Inicia sesión para acceder al sistema</p>
        </div>

        <form onSubmit={handleLogin} className="card">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base w-full" placeholder="tu@email.com" required />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-base w-full" placeholder="********" required />
          </div>

          <button type="submit" disabled={loading} className={`w-full btn-primary ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
