import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  const menus = {
    rrhh: [
      { name: "Inicio", path: "/rrhh", icon: "🏠" },
      { name: "Ausencias", path: "/rrhh/ausencias", icon: "📅" },
      { name: "Empleados", path: "/rrhh/empleados", icon: "👥" },
      { name: "QR", path: "/rrhh/qr", icon: "📱" },
      { name: "Reportes", path: "/rrhh/reportes", icon: "📊" },
      { name: "Usuarios", path: "/rrhh/usuarios", icon: "👤" },
      // 🟢 NUEVAS OPCIONES PARA TRASPASOS - RRHH
      { name: "Análisis", path: "/rrhh/dashboard-analisis", icon: "🤔" },
      { name: "Solicitudes", path: "/rrhh/gestion-solicitudes", icon: "📋" },
      { name: "Disponibles", path: "/rrhh/empleados-disponibles", icon: "👥" },
    ],
     subsecretario: [   // ← NUEVO
      { name: "Solicitudes", path: "/rrhh/gestion-solicitudes", icon: "📋" },
      { name: "Dashboard", path: "/rrhh/dashboard-analisis", icon: "📊" },
      { name: "Empleados", path: "/rrhh/empleados", icon: "👥" },
      { name: "Ausencias", path: "/rrhh/ausencias", icon: "📅" },
      { name: "Reportes", path: "/rrhh/reportes", icon: "📊" },
      { name: "Análisis", path: "/rrhh/dashboard-analisis", icon: "🤔" },
      { name: "Solicitudes", path: "/rrhh/gestion-solicitudes", icon: "📋" },
      { name: "Disponibles", path: "/rrhh/empleados-disponibles", icon: "👥" },
    ],
    admin: [
      { name: "Inicio", path: "/admin", icon: "🏠" },
      { name: "Empleados", path: "/admin/empleados", icon: "👥" },
      { name: "Asistencias", path: "/admin/asistencias", icon: "✅" },
      { name: "Ausencias", path: "/admin/ausencias", icon: "📅" },
      { name: "Reportes", path: "/admin/reportes", icon: "📊" },
      // 🟢 NUEVAS OPCIONES PARA TRASPASOS - ADMIN
      { name: "Solicitar", path: "/admin/solicitar-traspaso", icon: "📝" },
      { name: "Mis Solicitudes", path: "/admin/mis-solicitudes", icon: "📋" },
    ],
  };

  const currentMenus = menus[user?.rol] || [];

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/60">
      <div className="app-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Hamburger */}
          <div className="flex items-center space-x-3">
            {/* Hamburger Menu - Solo móvil */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Abrir menú"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <span className={`block h-0.5 w-6 bg-gray-600 transition-transform ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`block h-0.5 w-6 bg-gray-600 transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block h-0.5 w-6 bg-gray-600 transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </div>
            </button>

            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-municipio-500 to-municipio-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-lg font-semibold text-gray-900 leading-tight">Control de Asistencias</div>
                <div className="text-xs text-gray-500 capitalize leading-tight">
                  {user.nombre} {user.apellido} • {user.lugarTrabajo || 'Municipio'}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-1">
            {currentMenus.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-municipio-50 text-municipio-700 border border-municipio-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User & Logout - Desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm whitespace-nowrap cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>

          {/* User & Logout - Mobile (sin menú abierto) */}
          {!isMenuOpen && (
            <div className="lg:hidden flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.nombre.split(' ')[0]}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Salir
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 pt-4 pb-4">
            {/* Navigation Links */}
            <nav className="grid grid-cols-2 gap-2 mb-4">
              {currentMenus.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-2 p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-municipio-50 text-municipio-700 border border-municipio-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info Mobile */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-400 capitalize mt-1">
                  {user.rol} • {user.lugarTrabajo || 'Municipio'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}