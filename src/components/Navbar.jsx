import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

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

  return (
    <nav className="bg-blue-600 text-white flex justify-between items-center px-6 py-3 shadow-md">
      <h1 className="font-bold text-lg">Gestión de Asistencias</h1>
      <ul className="flex gap-4">
        {menus[user.rol]?.map((item) => (
          <li key={item.name}>
            <Link to={item.path} className="hover:underline">
              {item.name}
            </Link>
          </li>
        ))}
        <li>
          <button
            onClick={logout}
            className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
          >
            Cerrar sesión
          </button>
        </li>
      </ul>
    </nav>
  );
}
