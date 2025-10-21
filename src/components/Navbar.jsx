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
    <header className="navbar">
      <div className="brand">Gestión de Asistencias</div>
      <nav className="nav-list">
        {menus[user?.rol]?.map((item) => (
          <Link key={item.name} to={item.path} aria-label={item.name}>
            {item.name}
          </Link>
        ))}
        <button onClick={handleLogout} className="btn" style={{ marginLeft: 6 }}>
          Cerrar sesión
        </button>
      </nav>
    </header>
  );
}
