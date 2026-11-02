import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { db, collection, query, where, getDocs } from "../firebase";
import { getNotificaciones, marcarComoLeida } from "../utils/notificaciones";
import AppIcon from "./AppIcon";

const MENU_RRHH = [
  { name: "Inicio", path: "/rrhh", icon: "home" },
  { name: "Empleados", path: "/rrhh/empleados", icon: "users" },
  { name: "Ausencias", path: "/rrhh/ausencias", icon: "calendar" },
  { name: "Reportes", path: "/rrhh/reportes", icon: "chart" },
  { name: "Usuarios", path: "/rrhh/usuarios", icon: "user" },
  { name: "QR", path: "/rrhh/qr", icon: "qr" },
  { name: "Análisis", path: "/rrhh/dashboard-analisis", icon: "search" },
  { name: "Solicitudes", path: "/rrhh/gestion-solicitudes", icon: "clipboard" },
  { name: "Disponibles", path: "/rrhh/empleados-disponibles", icon: "available" },
  { name: "Vacaciones", path: "/rrhh/vacaciones", icon: "vacation" },
];
const MENU_ADMIN = [
  { name: "Inicio", path: "/admin", icon: "home" },
  { name: "Empleados", path: "/admin/empleados", icon: "users" },
  { name: "Asistencias", path: "/admin/asistencias", icon: "check" },
  { name: "Ausencias", path: "/admin/ausencias", icon: "calendar" },
  { name: "Reportes", path: "/admin/reportes", icon: "chart" },
  { name: "Solicitar traspaso", path: "/admin/solicitar-traspaso", icon: "send" },
  { name: "Mis solicitudes", path: "/admin/mis-solicitudes", icon: "clipboard" },
  { name: "Vacaciones", path: "/admin/vacaciones/nueva", icon: "vacation" },
];
const ROLES = { rrhh: "Recursos Humanos", subsecretario: "Subsecretario", admin: "Administrador de área", coordinador_traspasos: "Coordinador de traspasos" };

export default function Navbar({ darkMode, onToggleDarkMode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toolbarRef = useRef(null);
  const dialogRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState(null);

  useEffect(() => {
    let vigente = true;
    setNotificaciones([]);
    if (!user?.uid) return;
    const cargar = async () => {
      try {
        const datos = await getNotificaciones(user.uid);
        if (vigente) setNotificaciones(datos);
      } catch (error) { console.error("Error cargando notificaciones:", error); }
    };
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => { vigente = false; clearInterval(interval); };
  }, [user?.uid]);

  useEffect(() => {
    let vigente = true;
    setSolicitudesPendientes(0);
    if (!db || !["rrhh", "subsecretario"].includes(user?.rol)) return;
    const contar = async () => {
      try {
        const estado = user.rol === "subsecretario" ? "rrhh_aprobado" : "pendiente";
        const snapshot = await getDocs(query(collection(db, "solicitudes_traspaso"), where("estado", "==", estado)));
        if (vigente) setSolicitudesPendientes(snapshot.size);
      } catch (error) { console.error("Error contando solicitudes:", error); }
    };
    contar();
    const interval = setInterval(contar, 30000);
    return () => { vigente = false; clearInterval(interval); };
  }, [user?.uid, user?.rol]);

  useEffect(() => {
    setIsMenuOpen(false);
    setMostrarPerfil(false);
    setMostrarNotificaciones(false);
  }, [location.pathname]);

  useEffect(() => {
    const cerrarFuera = event => {
      if (!toolbarRef.current?.contains(event.target)) { setMostrarPerfil(false); setMostrarNotificaciones(false); }
    };
    const cerrarEscape = event => {
      if (event.key === "Escape") { setIsMenuOpen(false); setMostrarPerfil(false); setMostrarNotificaciones(false); }
    };
    document.addEventListener("pointerdown", cerrarFuera);
    document.addEventListener("keydown", cerrarEscape);
    return () => { document.removeEventListener("pointerdown", cerrarFuera); document.removeEventListener("keydown", cerrarEscape); };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (notificacionSeleccionada && !dialog?.open) dialog?.showModal();
    else if (!notificacionSeleccionada && dialog?.open) dialog.close();
  }, [notificacionSeleccionada]);

  if (!user) return null;
  const nombre = [user.nombre, user.apellido].filter(Boolean).join(" ").trim() || "Mi cuenta";
  const iniciales = [user.nombre?.trim()[0], user.apellido?.trim()[0]].filter(Boolean).join("").toUpperCase() || "U";
  const rol = ROLES[user.rol] || user.rol;
  const noLeidas = notificaciones.filter(n => !n.leido).length;
  const menus = {
    rrhh: MENU_RRHH,
    subsecretario: MENU_RRHH.filter(item => !["Usuarios", "QR"].includes(item.name)),
    coordinador_traspasos: MENU_RRHH.filter(item => item.name === "Solicitudes"),
    admin: MENU_ADMIN,
  };
  const currentMenus = menus[user.rol] || [];

  const abrirNotificacion = async notificacion => {
    try {
      if (!notificacion.leido) await marcarComoLeida(notificacion.id);
      setNotificaciones(actuales => actuales.map(item => item.id === notificacion.id ? { ...item, leido: true } : item));
    } catch (error) { console.error("Error marcando notificación:", error); }
    setMostrarNotificaciones(false);
    setNotificacionSeleccionada(notificacion);
  };

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const enlace = item => {
    const inicio = item.path === "/rrhh" || item.path === "/admin";
    const activo = location.pathname === item.path || (!inicio && location.pathname.startsWith(`${item.path}/`));
    return <Link key={item.path} to={item.path} className={`module-link ${activo ? "is-active" : ""}`} aria-current={activo ? "page" : undefined} onClick={() => setIsMenuOpen(false)}>
      <AppIcon name={item.icon} size={17} /><span>{item.name}</span>
      {item.name === "Solicitudes" && solicitudesPendientes > 0 && <span className="ml-auto rounded-full bg-municipio-600 px-1.5 py-0.5 text-[10px] text-white">{solicitudesPendientes}</span>}
    </Link>;
  };

  return <>
    <header className="app-navbar">
      <div className="navbar-inner">
        <div className="navbar-top">
          <div className="navbar-brand">
            <button type="button" className="icon-button navbar-menu-trigger" onClick={() => setIsMenuOpen(actual => !actual)} aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={isMenuOpen} aria-controls="menu-movil">
              <AppIcon name={isMenuOpen ? "close" : "menu"} />
            </button>
            <span className="brand-mark" aria-hidden="true">M</span>
            <div className="min-w-0">
              <div className="brand-title"><span className="hidden sm:inline">Control de </span>Asistencias</div>
              <div className="brand-subtitle hidden sm:block">Gestión de personal</div>
            </div>
          </div>

          <div className="navbar-tools" ref={toolbarRef}>
            <button type="button" className="icon-button" onClick={onToggleDarkMode} aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"} title={darkMode ? "Modo claro" : "Modo oscuro"}>
              <AppIcon name={darkMode ? "sun" : "moon"} />
            </button>
            <button type="button" className="icon-button" onClick={() => { setMostrarNotificaciones(actual => !actual); setMostrarPerfil(false); }} aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ""}`} aria-expanded={mostrarNotificaciones} aria-controls="panel-notificaciones">
              <AppIcon name="bell" />{noLeidas > 0 && <span className="notification-count">{noLeidas > 99 ? "99+" : noLeidas}</span>}
            </button>
            <span className="toolbar-divider" aria-hidden="true" />
            <button type="button" className="account-trigger" onClick={() => { setMostrarPerfil(actual => !actual); setMostrarNotificaciones(false); }} aria-label="Opciones de mi cuenta" aria-expanded={mostrarPerfil} aria-controls="panel-cuenta">
              <span className="user-avatar" aria-hidden="true">{iniciales}</span>
              <span className="hidden sm:block"><span className="account-name block">{nombre}</span><span className="account-role block">{rol}</span></span>
              <AppIcon name="chevron" size={14} className="hidden sm:block" />
            </button>

            {mostrarPerfil && <div id="panel-cuenta" className="toolbar-popover account-popover">
              <div className="px-3 py-2 sm:hidden"><p className="account-name">{nombre}</p><p className="account-role">{rol}</p></div>
              {user.lugarTrabajo && <p className="px-3 py-2 text-xs leading-5 text-muted">{user.lugarTrabajo}</p>}
              <button type="button" onClick={handleLogout} className="logout-action"><AppIcon name="logout" size={18} />Cerrar sesión</button>
            </div>}

            {mostrarNotificaciones && <section id="panel-notificaciones" className="toolbar-popover" aria-label="Notificaciones">
              <div className="popover-heading flex items-center justify-between gap-3"><span>Notificaciones</span><span className="text-xs font-normal text-muted">{noLeidas ? `${noLeidas} sin leer` : "Al día"}</span></div>
              {notificaciones.length ? <div className="max-h-[60dvh] overflow-y-auto">{notificaciones.map(n => <button key={n.id} type="button" onClick={() => abrirNotificacion(n)} className={`notification-item ${!n.leido ? "is-unread" : ""}`}><p className="font-semibold">{n.titulo}</p><p className="mt-1 line-clamp-3">{n.mensaje}</p></button>)}</div>
                : <div className="p-8 text-center text-muted"><AppIcon name="bell" size={28} className="mx-auto mb-3 opacity-50" /><p className="text-sm font-medium">Estás al día</p><p className="mt-1 text-xs">Tus nuevas notificaciones aparecerán acá.</p></div>}
            </section>}
          </div>
        </div>
        <nav className="desktop-navigation hidden lg:block" aria-label="Módulos"><div className="navigation-links">{currentMenus.map(enlace)}</div></nav>
        {isMenuOpen && <nav id="menu-movil" className="menu-panel lg:hidden" aria-label="Módulos en celular"><p className="page-eyebrow px-2">Módulos del sistema</p><div className="grid grid-cols-2 gap-1">{currentMenus.map(enlace)}</div></nav>}
      </div>
    </header>

    <dialog ref={dialogRef} className="notification-dialog" aria-labelledby="notificacion-titulo" onClose={() => setNotificacionSeleccionada(null)} onClick={event => { if (event.target === event.currentTarget) setNotificacionSeleccionada(null); }}>
      {notificacionSeleccionada && <>
        <div className="flex items-start justify-between gap-4"><div><p className="page-eyebrow">Notificación</p><h2 id="notificacion-titulo" className="text-xl font-semibold leading-snug">{notificacionSeleccionada.titulo}</h2></div>
          <button type="button" onClick={() => setNotificacionSeleccionada(null)} className="icon-button" aria-label="Cerrar notificación"><AppIcon name="close" /></button></div>
        <p className="my-6 whitespace-pre-wrap text-sm leading-7 text-muted">{notificacionSeleccionada.mensaje}</p>
        <div className="flex flex-wrap justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setNotificacionSeleccionada(null)}>Cerrar</button>
          {notificacionSeleccionada.link && <button type="button" className="btn-primary" onClick={() => { navigate(notificacionSeleccionada.link); setNotificacionSeleccionada(null); }}>Ir al módulo</button>}
        </div>
      </>}
    </dialog>
  </>;
}
