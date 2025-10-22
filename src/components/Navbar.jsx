// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const menus = {
    rrhh: [
      { name: "Inicio", path: "/rrhh", icon: "🏠" },
      { name: "Ausencias", path: "/rrhh/ausencias", icon: "📅" },
      { name: "Empleados", path: "/rrhh/empleados", icon: "👥" },
      { name: "QR", path: "/rrhh/qr", icon: "📱" },
      { name: "Reportes", path: "/rrhh/reportes", icon: "📊" },
      { name: "Usuarios", path: "/rrhh/usuarios", icon: "👤" },
    ],
    admin: [
      { name: "Inicio", path: "/admin", icon: "🏠" },
      { name: "Empleados", path: "/admin/empleados", icon: "👥" },
      { name: "Asistencias", path: "/admin/asistencias", icon: "✅" },
      { name: "Ausencias", path: "/admin/ausencias", icon: "📅" },
      { name: "Reportes", path: "/admin/reportes", icon: "📊" },
    ],
  };

  const currentMenus = menus[user?.rol] || [];

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
      <div className="app-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">Control de Asistencias</div>
              <div className="text-xs text-gray-500 capitalize">{user.rol} • {user.lugarTrabajo || 'Municipio'}</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {currentMenus.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}