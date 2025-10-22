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
    <header className="sticky top-4 z-40 app-container">
      <div className="bg-white/90 backdrop-blur card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-municipio-500 text-white rounded-lg flex items-center justify-center font-bold text-lg">M</div>
          <div>
            <div className="text-lg font-semibold">Gestión de Asistencias</div>
            <div className="text-xs muted">Municipio</div>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          {menus[user?.rol]?.map((item) => (
            <Link key={item.name} to={item.path} aria-label={item.name} className="px-3 py-1 rounded-md hover:bg-gray-100 font-medium">
              {item.name}
            </Link>
          ))}
          <button onClick={handleLogout} className="ml-2 btn-primary">Cerrar sesión</button>
        </nav>
      </div>
    </header>
  );
}
