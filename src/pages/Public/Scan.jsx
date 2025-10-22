// src/pages/Scan.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  validarToken,
  buscarEmpleadoPorLegajo,
  registrarAsistenciaPorLegajo,
  registrarNuevoEmpleado,
} from "../../utils/asistencia";

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
  const [nuevo, setNuevo] = useState({ nombre: "", apellido: "", lugarTrabajo: "", secretaria: "", horario: "" });
  const [bloqueado, setBloqueado] = useState(false); // 🔒 evita trampas

  useEffect(() => {
    (async () => {
      if (!tokenParam) {
        setMessage("❌ Acceso no permitido. Escanee un QR válido para fichar.");
        return;
      }
      try {
        await validarToken(tokenParam);
        setTokenValido(true);
        setMessage("✅ QR válido. Ingrese su legajo para fichar.");
      } catch (err) {
        setTokenValido(false);
        setMessage(err.message || "⏰ Este QR ya no es válido.");
      }
    })();
  }, [tokenParam]);

  async function handleBuscar(e) {
    e.preventDefault();
    if (!tokenValido) return setMessage("⏰ Este QR ya caducó. Solicite uno nuevo.");
    if (!legajo) return setMessage("Ingrese su legajo para continuar.");
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
      setMessage("⚠️ Error al buscar el empleado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegistrarAsistencia() {
    if (!tokenValido) return setMessage("⏰ Este QR ya caducó. Solicite uno nuevo.");
    setLoading(true);
    try {
      const res = await registrarAsistenciaPorLegajo(legajo, tokenParam);
      setMessage(`✅ ${res.empleado.nombre} ${res.empleado.apellido} registró ${res.tipo} a las ${res.hora}.`);
      setBloqueado(true); // 🔒 Bloquear input para evitar segunda fichada
      setShowRegistro(false);
    } catch (err) {
      setMessage(err.message || "Error al registrar la asistencia.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardarNuevo(e) {
    e.preventDefault();
    if (!tokenValido) return setMessage("⏰ Este QR ya caducó. Solicite uno nuevo.");
    if (!legajo || !nuevo.nombre || !nuevo.apellido)
      return setMessage("Complete todos los campos para registrarse.");
    setLoading(true);
    try {
      await registrarNuevoEmpleado({
        legajo,
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        lugarTrabajo: nuevo.lugarTrabajo || "",
        secretaria: nuevo.secretaria || "",
        horario: nuevo.horario || "",
      });
      setMessage("✅ Empleado registrado correctamente. Fichando...");
      setShowRegistro(false);
      setEmpleado({
        legajo,
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        lugarTrabajo: nuevo.lugarTrabajo,
      });
      await handleRegistrarAsistencia();
    } catch (err) {
      console.error(err);
      setMessage("Error guardando nuevo empleado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold">Registro de Asistencia</h2>
        <p className="text-sm text-gray-600 mt-2">{message}</p>

        {!showRegistro && (
          <form onSubmit={handleBuscar} className="mt-4">
            <label className="block text-sm font-medium mb-1">Legajo</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              disabled={bloqueado || !tokenValido}
              placeholder="Ingrese su legajo"
            />
            <div className="mt-3">
              <button type="submit" disabled={loading || !tokenValido || bloqueado} className="px-4 py-2 bg-municipio-500 text-white rounded">
                {loading ? "Buscando..." : "Buscar / Fichar"}
              </button>
            </div>
          </form>
        )}

        {empleado && (
          <div className="mt-4">
            <h3 className="text-lg font-medium">{empleado.nombre} {empleado.apellido}</h3>
            <p className="text-sm text-gray-700">Legajo: {empleado.legajo}</p>
            <p className="text-sm text-gray-700">Lugar: {empleado.lugarTrabajo}</p>
            <button onClick={handleRegistrarAsistencia} disabled={loading || !tokenValido || bloqueado} className="mt-3 px-4 py-2 bg-municipio-500 text-white rounded">
              {loading ? "Registrando..." : "Registrar asistencia"}
            </button>
          </div>
        )}

        {showRegistro && (
          <form onSubmit={handleGuardarNuevo} className="mt-4">
            <h3 className="text-lg font-medium">Registro de nuevo empleado</h3>
            <div className="grid grid-cols-1 gap-2 mt-2">
              <input className="border rounded px-3 py-2" placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Apellido" value={nuevo.apellido} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Lugar de trabajo" value={nuevo.lugarTrabajo} onChange={(e) => setNuevo({ ...nuevo, lugarTrabajo: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Secretaria" value={nuevo.secretaria} onChange={(e) => setNuevo({ ...nuevo, secretaria: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Horario" value={nuevo.horario} onChange={(e) => setNuevo({ ...nuevo, horario: e.target.value })} />
            </div>
            <div className="mt-3">
              <button type="submit" disabled={loading || !tokenValido} className="px-4 py-2 bg-municipio-500 text-white rounded">{loading ? "Guardando..." : "Guardar y fichar"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
