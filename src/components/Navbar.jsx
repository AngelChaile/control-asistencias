// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { db, collection, query, where, getDocs } from "../firebase";
import { getNotificaciones, marcarComoLeida } from "../utils/notificaciones";

export default function Navbar({ darkMode, onToggleDarkMode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const cargarNotificaciones = async () => setNotificaciones(await getNotificaciones(user.uid));
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  const abrirNotificacion = async (notificacion) => {
    if (!notificacion.leido) await marcarComoLeida(notificacion.id);
    setNotificaciones(actuales => actuales.map(item => item.id === notificacion.id ? { ...item, leido: true } : item));
    setMostrarNotificaciones(false);
    setNotificacionSeleccionada({ ...notificacion, leido: true });
  };

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
      { name: "Análisis", path: "/rrhh/dashboard-analisis", icon: "🔎" },
      { 
        name: "Solicitudes", path: "/rrhh/gestion-solicitudes", icon: "📋",
        badge: solicitudesPendientes > 0 ? solicitudesPendientes : null
      },
      { name: "Disponibles", path: "/rrhh/empleados-disponibles", icon: "🙎🏻‍♂️" },
    ],
    coordinador_traspasos: [
      { name: "Solicitudes", path: "/rrhh/gestion-solicitudes", icon: "📋" },
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
            <div className="relative">
              <button type="button" onClick={() => setMostrarNotificaciones(actual => !actual)} className="relative rounded-lg p-2 text-xl text-slate-600 hover:bg-slate-100" aria-label="Notificaciones">
                🔔
                {notificaciones.filter(item => !item.leido).length > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-xs text-white">{notificaciones.filter(item => !item.leido).length}</span>}
              </button>
              {mostrarNotificaciones && <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Notificaciones</div>
                {notificaciones.length ? <div className="max-h-96 overflow-y-auto">{notificaciones.map(notificacion => <button type="button" key={notificacion.id} onClick={() => abrirNotificacion(notificacion)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 ${notificacion.leido ? 'text-slate-500' : 'bg-blue-50 text-slate-900'}`}><p className="font-semibold">{notificacion.titulo}</p><p className="mt-1">{notificacion.mensaje}</p></button>)}</div> : <p className="p-4 text-sm text-slate-500">No tenés notificaciones.</p>}
              </div>}
            </div>
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
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
              title={darkMode ? "Modo claro" : "Modo oscuro"}
            >
              {darkMode ? "☀️" : "🌙"}
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
                type="button"
                onClick={() => setMostrarNotificaciones(actual => !actual)}
                className="relative rounded-lg p-2 text-xl text-slate-600 hover:bg-gray-100"
                aria-label="Notificaciones"
              >
                🔔
                {notificaciones.filter(item => !item.leido).length > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-xs text-white">
                    {notificaciones.filter(item => !item.leido).length}
                  </span>
                )}
              </button>
              {mostrarNotificaciones && (
                <div className="fixed right-4 top-16 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Notificaciones</div>
                  {notificaciones.length ? (
                    <div className="max-h-80 overflow-y-auto">
                      {notificaciones.map(notificacion => (
                        <button
                          type="button"
                          key={notificacion.id}
                          onClick={() => abrirNotificacion(notificacion)}
                          className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 ${notificacion.leido ? 'text-slate-500' : 'bg-blue-50 text-slate-900'}`}
                        >
                          <p className="font-semibold">{notificacion.titulo}</p>
                          <p className="mt-1">{notificacion.mensaje}</p>
                        </button>
                      ))}
                    </div>
                  ) : <p className="p-4 text-sm text-slate-500">No tenés notificaciones.</p>}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Salir
              </button>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-lg text-slate-700"
                aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>
          )}
        </div>

        {notificacionSeleccionada && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={() => setNotificacionSeleccionada(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Notificación</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{notificacionSeleccionada.titulo}</h2>
                </div>
                <button type="button" onClick={() => setNotificacionSeleccionada(null)} className="rounded-lg p-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar notificación">
                  ×
                </button>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">{notificacionSeleccionada.mensaje}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setNotificacionSeleccionada(null)}>Cerrar</button>
                {notificacionSeleccionada.link && (
                  <button type="button" className="btn-primary" onClick={() => { setNotificacionSeleccionada(null); navigate(notificacionSeleccionada.link); }}>
                    Ir al módulo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
