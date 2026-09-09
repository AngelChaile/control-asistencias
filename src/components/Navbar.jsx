// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { db, collection, query, where, getDocs } from "../firebase";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);

  // 🔔 Contar solicitudes pendientes para el globito
  useEffect(() => {
    if (!user) return;
    
    const contarSolicitudes = async () => {
      try {
        let q;
        if (user.rol === 'subsecretario') {
          q = query(collection(db, 'solicitudes_traspaso'), where('estado', '==', 'rrhh_aprobado'));
        } else if (user.rol === 'rrhh') {
          q = query(collection(db, 'solicitudes_traspaso'), where('estado', '==', 'pendiente'));
        } else {
          return;
        }
        const snapshot = await getDocs(q);
        setSolicitudesPendientes(snapshot.size);
      } catch (error) {
        console.error('Error contando solicitudes:', error);
      }
    };

    contarSolicitudes();
    const interval = setInterval(contarSolicitudes, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const menus = {
    rrhh: [
      { name: "Inicio", path: "/rrhh", icon: "🏠" },
      { name: "Empleados", path: "/rrhh/empleados", icon: "👥" },
      { name: "Ausencias", path: "/rrhh/ausencias", icon: "📅" },
      { name: "Reportes", path: "/rrhh/reportes", icon: "📊" },
      { name: "Usuarios", path: "/rrhh/usuarios", icon: "👤" },
      { name: "QR", path: "/rrhh/qr", icon: "📱" },
      { name: "Análisis", path: "/rrhh/dashboard-analisis", icon: "🔎" },
      { name: "Solicitudes", path: "/rrhh/gestion-solicitudes", icon: "📋" },
      { name: "Disponibles", path: "/rrhh/empleados-disponibles", icon: "🙎🏻‍♂️" },
    ],
    subsecretario: [
      { name: "Inicio", path: "/rrhh", icon: "🏠" },
      { name: "Empleados", path: "/rrhh/empleados", icon: "👥" },
      { name: "Ausencias", path: "/rrhh/ausencias", icon: "📅" },
      { name: "Reportes", path: "/rrhh/reportes", icon: "📊" },
      { name: "Análisis", path: "/rrhh/dashboard-analisis", icon: "🤔" },
      { 
        name: "Solicitudes", path: "/rrhh/gestion-solicitudes", icon: "📋",
        badge: solicitudesPendientes > 0 ? solicitudesPendientes : null
      },
      { name: "Disponibles", path: "/rrhh/empleados-disponibles", icon: "🙎🏻‍♂️" },
    ],
    admin: [
      { name: "Inicio", path: "/admin", icon: "🏠" },
      { name: "Empleados", path: "/admin/empleados", icon: "👥" },
      { name: "Asistencias", path: "/admin/asistencias", icon: "✅" },
      { name: "Ausencias", path: "/admin/ausencias", icon: "📅" },
      { name: "Reportes", path: "/admin/reportes", icon: "📊" },
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          {/* Logo */}
          <div className="flex min-w-0 items-center space-x-3">
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

            <div className="flex min-w-0 items-center space-x-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-municipio-500 to-municipio-600 shadow-sm">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div className="hidden sm:block">
                <div className="truncate text-lg font-semibold leading-tight text-slate-900">Control de Asistencias</div>
                <div className="truncate text-xs capitalize leading-tight text-slate-500">
                  {user.nombre} {user.apellido} • {user.rol === 'subsecretario' ? 'Subsecretario' : user.rol}
                </div>
              </div>
            </div>
          </div>

          {/* User & Logout - Desktop */}
          <div className="hidden flex-shrink-0 items-center gap-3 lg:flex">
            <div className="hidden text-right xl:block">
              <div className="text-sm font-semibold text-slate-800">{user.nombre} {user.apellido}</div>
              <div className="text-xs capitalize text-slate-500">{user.rol === 'subsecretario' ? 'Subsecretario' : user.rol}</div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary cursor-pointer whitespace-nowrap text-sm"
            >
              Cerrar sesión
            </button>
          </div>

          {/* Mobile */}
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

        {/* Navigation - Desktop */}
        <nav className="hidden border-t border-slate-100 lg:block">
          <div className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:thin]">
            {currentMenus.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-municipio-50 text-municipio-700 ring-1 ring-inset ring-municipio-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                  {item.badge && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 pt-4 pb-4">
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
                    {item.badge && (
                      <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

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