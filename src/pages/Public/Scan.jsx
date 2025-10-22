import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { validarToken, buscarEmpleadoPorLegajo, registrarAsistenciaPorLegajo, registrarNuevoEmpleado } from "../../utils/asistencia";

// Clean single-component Scan.jsx (atomic overwrite)
export default function Scan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenParam = searchParams.get("token") || null;

  const [legajo, setLegajo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const [showRegistro, setShowRegistro] = useState(false);
  const [tokenValido, setTokenValido] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", apellido: "", lugarTrabajo: "" });
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    (async () => {
      if (!tokenParam) {
        setMessage("❌ Acceso no permitido. Escanee un QR válido para fichar.");
        return;
      }
      setLoading(true);
      try {
        await validarToken(tokenParam);
        setTokenValido(true);
        setMessage("Token válido. Ingrese su legajo o búsquelo.");
      } catch (err) {
        setTokenValido(false);
        setMessage(err?.message || "Token inválido.");
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenParam]);

  const handleBuscar = async (e) => {
    e?.preventDefault();
    if (!legajo) return setMessage("Ingrese un legajo para buscar.");
    setLoading(true);
    try {
      const emp = await buscarEmpleadoPorLegajo(legajo);
      if (!emp) {
        setShowRegistro(true);
        setEmpleado(null);
        setMessage("Empleado no encontrado. Complete el registro.");
      } else {
        setEmpleado(emp);
        setShowRegistro(false);
        setMessage(`Empleado encontrado: ${emp.nombre} ${emp.apellido}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error al buscar el empleado.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarAsistencia = async () => {
    if (!tokenValido) return setMessage("⏰ Este QR ya caducó.");
    if (!empleado) return setMessage("Empleado no seleccionado.");
    setLoading(true);
    try {
      const res = await registrarAsistenciaPorLegajo(empleado.legajo, tokenParam);
      setMessage(`Asistencia registrada: ${res.tipo} a las ${res.hora}`);
      setBloqueado(true);
      setTimeout(() => navigate("/gracias"), 900);
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Error al registrar la asistencia.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarNuevo = async (e) => {
    e.preventDefault();
    if (!legajo || !nuevo.nombre || !nuevo.apellido) return setMessage("Complete todos los campos.");
    setLoading(true);
    try {
      await registrarNuevoEmpleado({ legajo, ...nuevo });
      setMessage("Empleado registrado. Registrando asistencia...");
      setEmpleado({ legajo, nombre: nuevo.nombre, apellido: nuevo.apellido, lugarTrabajo: nuevo.lugarTrabajo });
      setShowRegistro(false);
      await handleRegistrarAsistencia();
    } catch (err) {
      console.error(err);
      setMessage("Error creando empleado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container px-4 py-6">
      <div className="hero mb-4 text-center">
        <h2 className="text-2xl font-semibold">Fichar</h2>
        <p className="muted mt-1">Escanee el QR o pegue el token y luego ingrese su legajo</p>
      </div>

      <div className="card max-w-xl mx-auto">
        <p className="text-sm text-gray-600 mt-2">{message}</p>

        <form onSubmit={handleBuscar} className="mt-3">
          <div className="flex gap-2">
            <input
              className="input-base flex-1"
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              disabled={bloqueado || !tokenValido}
              placeholder="Legajo"
            />
            <button type="submit" disabled={loading || !tokenValido || bloqueado} className="px-4 py-2 bg-municipio-500 text-white rounded-lg shadow">
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </form>

        {empleado && (
          <div className="mt-4">
            <h3 className="text-lg font-medium">{empleado.nombre} {empleado.apellido}</h3>
            <p className="text-sm text-gray-700">Legajo: {empleado.legajo}</p>
            <p className="text-sm text-gray-700">Lugar: {empleado.lugarTrabajo}</p>
            <div className="mt-3">
              <button onClick={handleRegistrarAsistencia} disabled={loading || !tokenValido || bloqueado} className="btn-primary">
                {loading ? "Registrando..." : "Fichar"}
              </button>
            </div>
          </div>
        )}

        {showRegistro && (
          <form onSubmit={handleGuardarNuevo} className="mt-4">
            <h3 className="text-lg font-medium">Registrar nuevo empleado</h3>
            <div className="grid grid-cols-1 gap-2 mt-2">
              <input className="input-base" placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              <input className="input-base" placeholder="Apellido" value={nuevo.apellido} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} />
              <input className="input-base" placeholder="Lugar de trabajo" value={nuevo.lugarTrabajo} onChange={(e) => setNuevo({ ...nuevo, lugarTrabajo: e.target.value })} />
            </div>
            <div className="mt-3">
              <button type="submit" disabled={loading || !tokenValido} className="btn-primary">{loading ? "Guardando..." : "Guardar y fichar"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

