import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { validarToken, buscarEmpleadoPorLegajo, registrarAsistenciaPorLegajo, registrarNuevoEmpleado } from "../../utils/asistencia";

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
        setMessage("Ingrese su legajo para continuar.");
      } catch (err) {
        setTokenValido(false);
        setMessage("❌ " + (err?.message || "Token inválido o expirado."));
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenParam]);

  const handleBuscar = async (e) => {
    e?.preventDefault();
    if (!legajo.trim()) return setMessage("⚠️ Ingrese un legajo para buscar.");
    setLoading(true);
    try {
      const emp = await buscarEmpleadoPorLegajo(legajo);
      if (!emp) {
        setShowRegistro(true);
        setEmpleado(null);
        setMessage("🔍 Empleado no encontrado. Complete el registro.");
      } else {
        setEmpleado(emp);
        setShowRegistro(false);
        setMessage(`✅ Empleado encontrado: ${emp.nombre} ${emp.apellido}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Error al buscar el empleado.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarAsistencia = async () => {
    if (!tokenValido) return setMessage("⏰ Este QR ya caducó.");
    if (!empleado) return setMessage("⚠️ Empleado no seleccionado.");
    setLoading(true);
    try {
      const res = await registrarAsistenciaPorLegajo(empleado.legajo, tokenParam);
      setMessage(`✅ Asistencia registrada: ${res.tipo} a las ${res.hora}`);
      setBloqueado(true);
      setTimeout(() => setMessage("Gracias"), 3000);
    } catch (err) {
      console.error(err);
      setMessage("❌ " + (err?.message || "Error al registrar la asistencia."));
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarNuevo = async (e) => {
    e.preventDefault();
    if (!legajo.trim() || !nuevo.nombre.trim() || !nuevo.apellido.trim()) {
      return setMessage("⚠️ Complete todos los campos obligatorios.");
    }
    setLoading(true);
    try {
      await registrarNuevoEmpleado({ legajo, ...nuevo });
      setMessage("✅ Empleado registrado. Registrando asistencia...");
      setEmpleado({ legajo, nombre: nuevo.nombre, apellido: nuevo.apellido, lugarTrabajo: nuevo.lugarTrabajo, secretaria: nuevo.secretaria, horario: nuevo.horario });
      setShowRegistro(false);
      await handleRegistrarAsistencia();
    } catch (err) {
      console.error(err);
      setMessage("❌ Error creando empleado.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarRegistro = () => {
    setShowRegistro(false);
    setNuevo({ nombre: "", apellido: "", secretaria: "", horario: "" });
    setMessage("📝 Registro cancelado. Ingrese un legajo válido.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-municipio-500 to-municipio-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-white text-2xl">📱</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registro de Asistencia</h1>
          <p className="text-gray-600">
            {tokenValido ? "Ingrese su legajo para fichar" : "Escanee un QR válido"}
          </p>
        </div>

        {/* Card Principal */}
        <div className="card p-6 space-y-4">
          {/* Estado del Token */}
          <div className={`p-3 rounded-lg text-center text-sm font-medium ${
            tokenValido 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {tokenValido ? '✅ QR Válido' : '❌ QR Inválido'}
          </div>

          {/* Mensaje de Estado */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
              message.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
              message.includes('⚠️') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {message}
            </div>
          )}

          {/* Formulario de Búsqueda */}
          {tokenValido && !bloqueado && (
            <form onSubmit={handleBuscar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Legajo
                </label>
                <input
                  className="input-modern w-full"
                  value={legajo}
                  onChange={(e) => setLegajo(e.target.value)}
                  disabled={loading}
                  placeholder="Ingrese su legajo"
                  type="number"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading || !legajo.trim()}
                className="w-full btn-primary py-3"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                    Buscando...
                  </div>
                ) : (
                  "🔍 Buscar Empleado"
                )}
              </button>
            </form>
          )}

          {/* Información del Empleado Encontrado */}
          {empleado && !showRegistro && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Empleado Encontrado</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nombre:</span>
                    <span className="font-medium">{empleado.nombre} {empleado.apellido}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Legajo:</span>
                    <span className="font-medium">{empleado.legajo}</span>
                  </div>
                  {empleado.lugarTrabajo && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Área:</span>
                      <span className="font-medium">{empleado.lugarTrabajo}</span>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={handleRegistrarAsistencia}
                disabled={loading || bloqueado}
                className="w-full btn-primary py-3"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                    Registrando...
                  </div>
                ) : (
                  "✅ Registrar Asistencia"
                )}
              </button>
            </div>
          )}

          {/* Formulario de Registro de Nuevo Empleado */}
          {showRegistro && (
            <form onSubmit={handleGuardarNuevo} className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">Nuevo Registro</h3>
                <p className="text-sm text-yellow-700">
                  Complete los datos para registrar al nuevo empleado
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    className="input-modern w-full"
                    value={nuevo.nombre}
                    onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                    placeholder="Nombre del empleado"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido *
                  </label>
                  <input
                    className="input-modern w-full"
                    value={nuevo.apellido}
                    onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })}
                    placeholder="Apellido del empleado"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lugar de Trabajo
                  </label>
                  <input
                    className="input-modern w-full"
                    value={nuevo.lugarTrabajo}
                    onChange={(e) => setNuevo({ ...nuevo, lugarTrabajo: e.target.value })}
                    placeholder="Área o departamento"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secretaría
                  </label>
                  <input
                    className="input-modern w-full"
                    value={nuevo.secretaria}
                    onChange={(e) => setNuevo({ ...nuevo, secretaria: e.target.value })}
                    placeholder="Secretaría"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horario
                  </label>
                  <input
                    className="input-modern w-full"
                    value={nuevo.horario}
                    onChange={(e) => setNuevo({ ...nuevo, horario: e.target.value })}
                    placeholder="Horario Ej: 08:00 - 15:00"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 btn-primary py-3"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                      Guardando...
                    </div>
                  ) : (
                    "💾 Guardar y Fichar"
                  )}
                </button>
                
                <button 
                  type="button"
                  onClick={handleCancelarRegistro}
                  disabled={loading}
                  className="btn-secondary py-3 px-4"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Mensaje de Éxito */}
          {bloqueado && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-green-600 text-4xl mb-2">✅</div>
              <h3 className="font-semibold text-green-800 mb-1">¡Asistencia Registrada!</h3>
              <p className="text-sm text-green-700">
                Ya puede cerrar esta ventana.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Sistema de Asistencias • Municipalidad
          </p>
        </div>
      </div>
    </div>
  );
}