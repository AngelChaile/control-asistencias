import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const menus = {
    rrhh: [
      { name: "Inicio", path: "/rrhh" },
      { name: "Ausencias", path: "/rrhh/ausencias" },
      { name: "Empleados", path: "/rrhh/empleados" },
      { name: "QR", path: "/rrhh/qr" },
      { name: "Reportes", path: "/rrhh/reportes" },
      { name: "Usuarios", path: "/rrhh/usuarios" },
    ],
    admin: [
      { name: "Inicio", path: "/admin" },
      { name: "Empleados", path: "/admin/empleados" },
      { name: "Asistencias", path: "/admin/asistencias" },
      { name: "Ausencias", path: "/admin/ausencias" },
      { name: "Reportes", path: "/admin/reportes" },
    ],
  };

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="bg-municipio-500 text-white rounded-lg mx-4 my-4 p-4 shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-municipio-600 font-bold">M</div>
        <div className="text-lg font-semibold">Gestión de Asistencias</div>
      </div>

      <nav className="flex items-center gap-4">
        {menus[user?.rol]?.map((item) => (
          <Link key={item.name} to={item.path} aria-label={item.name} className="hover:underline font-medium">
            {item.name}
          </Link>
        ))}
        <button onClick={handleLogout} className="ml-2 bg-white text-municipio-700 px-3 py-1 rounded-md font-semibold hover:bg-gray-100">
          Cerrar sesión
        </button>
      </nav>
    </header>
  );
}
