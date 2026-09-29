// src/pages/RRHH/Vacaciones/SolicitudVacaciones.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { buscarEmpleadoPorLegajo } from "../../../utils/asistencia";
import {
  calcularVacaciones,
  parseFechaLocal,
  calcularAntiguedad,
  crearSolicitudVacaciones,
  fetchDiasDisponibles,
  calcularDiasRango,
  TABLAS_CONVENIO,
} from "../../../utils/vacaciones";
import FormularioImpresion from "./FormularioImpresion";

const CONVENIOS = Object.keys(TABLAS_CONVENIO);
const ANIO_ACTUAL = new Date().getFullYear();

// ── Mapeo particion → convenio ────────────────────────────────────
// El campo "particion" en Firestore usa valores como "municipal", "docente", etc.
const PARTICION_A_CONVENIO = {
  municipal: "Municipal",
  docente:   "Docente",
  medico:    "Medico",
  radiologo: "Radiologo",
};

function toISODate(str) {
  // Convierte "dd/mm/yyyy" o "yyyy-mm-dd" a "yyyy-mm-dd" para input[type=date]
  if (!str) return "";
  const local = String(str).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (local) return `${local[3]}-${local[2]}-${local[1]}`;
  const iso = String(str).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return str;
  return "";
}

/**
 * Detecta automáticamente si el empleado tiene reingreso en el año vacacional.
 * Condición: fechaReingreso existe Y su año coincide con el año vacacional.
 */
function detectarReingreso(fechaReingresoStr, anioVacacional) {
  if (!fechaReingresoStr) return false;
  const fr = parseFechaLocal(toISODate(fechaReingresoStr));
  if (!fr) return false;
  return fr.getFullYear() === Number(anioVacacional);
}

function InputField({ label, id, required, children, hint, readOnly }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
        {readOnly && <span className="text-xs text-gray-400 font-normal">(auto)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export default function SolicitudVacaciones() {
  const { user } = useAuth();
  const legajoRef = useRef(null);

  // ── Datos del agente ──────────────────────────────────────────────
  const [legajo, setLegajo] = useState("");
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [empleadoCargado, setEmpleadoCargado] = useState(false); // flag para mostrar badge
  const [errorLegajo, setErrorLegajo] = useState("");

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [cargo, setCargo] = useState("");
  const [area, setArea] = useState("");
  const [convenio, setConvenio] = useState("Municipal");
  const [esJerarquico, setEsJerarquico] = useState(false);
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [anioVacacional, setAnioVacacional] = useState(ANIO_ACTUAL);

  // ── Casos especiales ─────────────────────────────────────────────
  const [esReingreso, setEsReingreso] = useState(false);
  const [fechaReingreso, setFechaReingreso] = useState("");
  const [reingresoAutoDetectado, setReingresoAutoDetectado] = useState(false);
  const [esCambioConvenio, setEsCambioConvenio] = useState(false);
  const [convenioAnterior, setConvenioAnterior] = useState("");
  const [mesesConvenioAnterior, setMesesConvenioAnterior] = useState("");
  const [mesesConvenioNuevo, setMesesConvenioNuevo] = useState("");

  // ── Solicitud ─────────────────────────────────────────────────────
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // ── Cálculo del rango de fechas ───────────────────────────────────
  // diasRango: días que consume el rango según tipo del convenio (hábiles o corridos)
  const [diasRango, setDiasRango] = useState(null);
  const [errorRango, setErrorRango] = useState("");

  // ── Estado UI ─────────────────────────────────────────────────────
  const [calculo, setCalculo] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [cargandoSaldo, setCargandoSaldo] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [solicitudGuardada, setSolicitudGuardada] = useState(null);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);

  // ── Recalcular días del rango cuando cambian fechas o convenio ───
  useEffect(() => {
    setDiasRango(null);
    setErrorRango("");
    if (!fechaDesde || !fechaHasta || !convenio) return;
    if (fechaDesde > fechaHasta) {
      setErrorRango("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }
    try {
      const { diasRango: dr, tipo } = calcularDiasRango(convenio, fechaDesde, fechaHasta);
      setDiasRango({ cantidad: dr, tipo });
    } catch (e) {
      setErrorRango(e.message);
    }
  }, [fechaDesde, fechaHasta, convenio]);

  // ── Buscar empleado por legajo ────────────────────────────────────
  const handleBuscarEmpleado = useCallback(async (legajoVal) => {
    const lj = (legajoVal ?? legajo).trim();
    if (!lj) return;

    setErrorLegajo("");
    setBuscandoEmpleado(true);
    setEmpleadoCargado(false);
    setCalculo(null);
    setSaldo(null);

    try {
      const emp = await buscarEmpleadoPorLegajo(lj);
      if (!emp) {
        setErrorLegajo(`No se encontró ningún empleado con legajo "${lj}".`);
        return;
      }

      // Poblar campos con datos del empleado
      setNombreCompleto(`${emp.apellido || ""}, ${emp.nombre || ""}`.trim().replace(/^,\s*/, ""));
      setCargo(emp.funcion || emp.categoria || "");
      setArea(emp.area?.nombre || emp.lugarTrabajo || emp.secretaria || "");

      // Mapear particion → convenio
      const convMapeado = PARTICION_A_CONVENIO[String(emp.particion || "").toLowerCase()] || "Municipal";
      setConvenio(convMapeado);

      // Fechas
      const fi = toISODate(emp.fechaIngreso || "");
      const fr = toISODate(emp.fechaReingreso || "");
      setFechaIngreso(fi);
      setFechaReingreso(fr);

      // Detectar reingreso automáticamente
      const hayReingreso = detectarReingreso(emp.fechaReingreso, anioVacacional);
      setEsReingreso(hayReingreso);
      setReingresoAutoDetectado(hayReingreso);

      setEmpleadoCargado(true);
    } catch (e) {
      setErrorLegajo("Error al buscar el empleado: " + e.message);
    } finally {
      setBuscandoEmpleado(false);
    }
  }, [legajo, anioVacacional]);

  // Cuando cambia el año vacacional, re-evaluar si hay reingreso
  const handleAnioChange = (nuevoAnio) => {
    setAnioVacacional(nuevoAnio);
    setCalculo(null);
    setSaldo(null);
    if (fechaReingreso) {
      const hayReingreso = detectarReingreso(fechaReingreso, nuevoAnio);
      setEsReingreso(hayReingreso);
      setReingresoAutoDetectado(hayReingreso);
    }
  };

  // Invalidar resultados y consultas pendientes cuando cambian los datos del cálculo.
  const calculoVersion = useRef(0);
  useEffect(() => {
    calculoVersion.current += 1;
    setCalculo(null);
    setSaldo(null);
    setCargandoSaldo(false);
    setError("");
    return () => { calculoVersion.current += 1; };
  }, [fechaDesde, fechaHasta, convenio, fechaIngreso, fechaReingreso, anioVacacional,
    legajo, esReingreso, esCambioConvenio, convenioAnterior, mesesConvenioAnterior, mesesConvenioNuevo]);

  // ── Calcular días + consultar saldo ──────────────────────────────
  const handleCalcular = useCallback(async () => {
    const version = ++calculoVersion.current;
    setError("");
    setCalculo(null);
    setSaldo(null);

    if (!fechaIngreso) { setError("Ingresá la fecha de ingreso o buscá el empleado por legajo."); return; }
    if (!convenio)     { setError("Seleccioná un convenio."); return; }
    if (!fechaDesde || !fechaHasta) { setError("Seleccioná el rango de fechas de la licencia antes de calcular."); return; }
    if (fechaDesde > fechaHasta) { setError("La fecha de inicio no puede ser posterior a la fecha de fin."); return; }
    if (esReingreso && !fechaReingreso) { setError("Ingresá la fecha de reingreso."); return; }
    if (esCambioConvenio && !convenioAnterior) { setError("Seleccioná el convenio anterior."); return; }

    try {
      const resultado = calcularVacaciones({
        convenio,
        fechaIngreso,
        fechaDesde,
        anioVacacional: Number(anioVacacional),
        esReingreso,
        fechaReingreso: esReingreso ? fechaReingreso : null,
        esCambioConvenio,
        convenioAnterior: esCambioConvenio ? convenioAnterior : null,
        mesesConvenioAnterior: esCambioConvenio ? Number(mesesConvenioAnterior) : 0,
        mesesConvenioNuevo: esCambioConvenio ? Number(mesesConvenioNuevo) : 0,
      });

      const ingreso = parseFechaLocal(fechaIngreso);
      const ref = new Date(Number(anioVacacional), 11, 31);
      const antiguedad = calcularAntiguedad(ingreso, ref);

      setCalculo({ ...resultado, antiguedad });

      if (legajo) {
        setCargandoSaldo(true);
        try {
          const saldoData = await fetchDiasDisponibles(legajo, Number(anioVacacional), resultado.dias);
          if (version === calculoVersion.current) setSaldo(saldoData);
        } catch { /* no crítico */ } finally {
          if (version === calculoVersion.current) setCargandoSaldo(false);
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }, [
    convenio, fechaIngreso, fechaReingreso, anioVacacional, legajo, fechaDesde, fechaHasta,
    esReingreso, esCambioConvenio, convenioAnterior, mesesConvenioAnterior, mesesConvenioNuevo,
  ]);

  // ── Guardar solicitud ─────────────────────────────────────────────
  const handleGuardar = async () => {
    setError("");
    if (!legajo)         { setError("Ingresá el legajo."); return; }
    if (!nombreCompleto) { setError("Ingresá el nombre completo."); return; }
    if (!calculo)        { setError("Primero calculá los días correspondientes."); return; }
    if (!fechaDesde || !fechaHasta) { setError("Seleccioná el rango de fechas de la licencia."); return; }
    if (!diasRango || diasRango.cantidad < 1) { setError("El rango de fechas no contiene días válidos."); return; }

    // Validar contra saldo disponible
    const diasMax = saldo ? saldo.diasDisponibles : calculo.dias;
    if (diasRango.cantidad > diasMax) {
      const msg = saldo && saldo.diasUsados > 0
        ? `El rango seleccionado consume ${diasRango.cantidad} días ${diasRango.tipo}, pero solo quedan ${saldo.diasDisponibles} disponibles (ya usó ${saldo.diasUsados}).`
        : `El rango seleccionado consume ${diasRango.cantidad} días ${diasRango.tipo}, pero solo corresponden ${calculo.dias}.`;
      setError(msg);
      return;
    }

    setGuardando(true);
    try {
      const solicitud = await crearSolicitudVacaciones({
        legajo,
        nombreCompleto,
        cargo,
        area,
        convenio,
        esJerarquico,
        fechaIngreso,
        anioVacacional: Number(anioVacacional),
        diasSolicitados: diasRango.cantidad,   // ← calculado automáticamente
        fechaDesde,
        fechaHasta,
        observaciones,
        solicitadoPor: user?.uid || "",
        esReingreso,
        fechaReingreso: esReingreso ? fechaReingreso : null,
        esCambioConvenio,
        convenioAnterior: esCambioConvenio ? convenioAnterior : null,
        mesesConvenioAnterior: esCambioConvenio ? Number(mesesConvenioAnterior) : 0,
        mesesConvenioNuevo: esCambioConvenio ? Number(mesesConvenioNuevo) : 0,
      });
      setSolicitudGuardada(solicitud);
    } catch (e) {
      setError("Error al guardar: " + e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleNueva = () => {
    setSolicitudGuardada(null); setCalculo(null); setSaldo(null);
    setLegajo(""); setNombreCompleto(""); setCargo(""); setArea("");
    setConvenio("Municipal"); setEsJerarquico(false);
    setFechaIngreso(""); setFechaReingreso("");
    setAnioVacacional(ANIO_ACTUAL);
    setEsReingreso(false); setReingresoAutoDetectado(false);
    setEsCambioConvenio(false); setConvenioAnterior("");
    setMesesConvenioAnterior(""); setMesesConvenioNuevo("");
    setFechaDesde(""); setFechaHasta("");
    setDiasRango(null); setErrorRango("");
    setObservaciones(""); setError(""); setErrorLegajo("");
    setEmpleadoCargado(false);
    setTimeout(() => legajoRef.current?.focus(), 50);
  };

  // ── Vista de impresión ────────────────────────────────────────────
  if (mostrarImpresion && solicitudGuardada) {
    return <FormularioImpresion solicitud={solicitudGuardada} onVolver={() => setMostrarImpresion(false)} />;
  }

  // ── Solicitud guardada con éxito ──────────────────────────────────
  if (solicitudGuardada) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Solicitud generada</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Número de solicitud:</p>
          <p className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 mb-6">
            {solicitudGuardada.nroSolicitud}
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-left mb-6 space-y-1 text-sm">
            <p><span className="font-medium">Agente:</span> {solicitudGuardada.nombreCompleto}</p>
            <p><span className="font-medium">Legajo:</span> {solicitudGuardada.legajo}</p>
            <p><span className="font-medium">Convenio:</span> {solicitudGuardada.convenio}</p>
            <p><span className="font-medium">Días que corresponden:</span> {solicitudGuardada.diasCorresponden} ({solicitudGuardada.tipoDias})</p>
            <p><span className="font-medium">Días solicitados:</span> {solicitudGuardada.diasSolicitados}</p>
            <p><span className="font-medium">Período:</span> {solicitudGuardada.anioVacacional}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMostrarImpresion(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition">
              🖨️ Imprimir formulario
            </button>
            <button onClick={handleNueva}
              className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-xl transition">
              Nueva solicitud
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📋 Solicitud de Licencia Anual Ordinaria</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Ingresá el legajo para cargar los datos del agente automáticamente.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-6">

          {/* ── Sección: Búsqueda por legajo ── */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
              Búsqueda del agente
            </h2>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <InputField label="Legajo" id="legajo" required>
                  <input
                    ref={legajoRef}
                    id="legajo" type="text" value={legajo}
                    onChange={e => { setLegajo(e.target.value); setEmpleadoCargado(false); setErrorLegajo(""); }}
                    onKeyDown={e => { if (e.key === "Enter") handleBuscarEmpleado(); }}
                    className="input-base" placeholder="Ej: 1234 — Enter para buscar"
                  />
                </InputField>
              </div>
              <button
                onClick={() => handleBuscarEmpleado()}
                disabled={buscandoEmpleado || !legajo.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl transition whitespace-nowrap"
              >
                {buscandoEmpleado ? "Buscando..." : "🔍 Buscar"}
              </button>
            </div>

            {errorLegajo && (
              <p className="text-sm text-red-600 dark:text-red-400">⚠️ {errorLegajo}</p>
            )}

            {empleadoCargado && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-2">
                <span>✅</span>
                <span>Datos del agente cargados correctamente.</span>
                {reingresoAutoDetectado && (
                  <span className="ml-2 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                    Reingreso detectado automáticamente
                  </span>
                )}
              </div>
            )}
          </section>

          {/* ── Sección: Datos del agente (readonly si vienen de Firestore) ── */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
              Datos del agente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Nombre completo" id="nombre" required readOnly={empleadoCargado}>
                <input id="nombre" type="text" value={nombreCompleto}
                  onChange={e => setNombreCompleto(e.target.value)}
                  className={`input-base ${empleadoCargado ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300" : ""}`}
                  placeholder="Apellido, Nombre"
                  readOnly={empleadoCargado}
                />
              </InputField>
              <InputField label="Cargo / Función" id="cargo" readOnly={empleadoCargado}>
                <input id="cargo" type="text" value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  className={`input-base ${empleadoCargado ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300" : ""}`}
                  placeholder="Ej: Administrativo"
                  readOnly={empleadoCargado}
                />
              </InputField>
              <InputField label="Área / Secretaría" id="area" readOnly={empleadoCargado}>
                <input id="area" type="text" value={area}
                  onChange={e => setArea(e.target.value)}
                  className={`input-base ${empleadoCargado ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300" : ""}`}
                  placeholder="Ej: Sec. de Salud"
                  readOnly={empleadoCargado}
                />
              </InputField>
              <InputField label="Convenio" id="convenio" required readOnly={empleadoCargado}>
                <select id="convenio" value={convenio}
                  onChange={e => setConvenio(e.target.value)}
                  className="input-base"
                  disabled={empleadoCargado}
                >
                  {CONVENIOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </InputField>
              <InputField label="Fecha de ingreso" id="fechaIngreso" required readOnly={empleadoCargado}>
                <input id="fechaIngreso" type="date" value={fechaIngreso}
                  onChange={e => setFechaIngreso(e.target.value)}
                  className={`input-base ${empleadoCargado ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300" : ""}`}
                  readOnly={empleadoCargado}
                />
              </InputField>
              <InputField label="Año vacacional" id="anio" required>
                <input id="anio" type="number" value={anioVacacional}
                  onChange={e => handleAnioChange(e.target.value)}
                  className="input-base" min="2020" max="2099"
                />
              </InputField>
              {convenio === "Municipal" && (
                <InputField label="¿Cargo jerárquico?" id="jerarquico">
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={esJerarquico} onChange={e => setEsJerarquico(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Sí, es cargo jerárquico</span>
                  </label>
                </InputField>
              )}
            </div>
          </section>

          {/* ── Sección: Casos especiales ── */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
              Casos especiales
            </h2>

            {/* Reingreso */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={esReingreso}
                  onChange={e => { setEsReingreso(e.target.checked); if (e.target.checked) setEsCambioConvenio(false); }}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reingreso (dejó de trabajar y volvió)
                </span>
                {reingresoAutoDetectado && (
                  <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full font-semibold">
                    Auto-detectado
                  </span>
                )}
              </label>
              {esReingreso && (
                <div className="ml-6 mt-3 space-y-2">
                  <InputField label="Fecha de reingreso" id="fechaReingreso" required
                    readOnly={reingresoAutoDetectado}
                    hint={reingresoAutoDetectado
                      ? "Cargada automáticamente desde el legajo. El proporcional se calcula según la grilla oficial."
                      : "Se calculará el proporcional según la grilla oficial."
                    }>
                    <input id="fechaReingreso" type="date" value={fechaReingreso}
                      onChange={e => setFechaReingreso(e.target.value)}
                      className={`input-base max-w-xs ${reingresoAutoDetectado ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300" : ""}`}
                      readOnly={reingresoAutoDetectado}
                    />
                  </InputField>
                  {fechaIngreso && fechaReingreso && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2">
                      📌 La antigüedad se calcula desde la fecha de ingreso original ({fechaIngreso}).
                      El proporcional aplica solo al año del reingreso y cuenta los meses completos
                      hasta el inicio de la licencia, dentro de ese período. Para otros períodos se
                      usan los días normales según antigüedad.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cambio de convenio */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={esCambioConvenio}
                onChange={e => { setEsCambioConvenio(e.target.checked); if (e.target.checked) setEsReingreso(false); }}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cambio de convenio en el año vacacional
              </span>
            </label>
            {esCambioConvenio && (
              <div className="ml-6 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField label="Convenio anterior" id="convAnterior" required>
                  <select id="convAnterior" value={convenioAnterior} onChange={e => setConvenioAnterior(e.target.value)} className="input-base">
                    <option value="">Seleccionar...</option>
                    {CONVENIOS.filter(c => c !== convenio).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </InputField>
                <InputField label="Meses en conv. anterior" id="mesesAnt" required>
                  <input id="mesesAnt" type="number" min="1" max="11" value={mesesConvenioAnterior}
                    onChange={e => setMesesConvenioAnterior(e.target.value)} className="input-base" placeholder="1-11" />
                </InputField>
                <InputField label="Meses en conv. nuevo" id="mesesNuevo" required>
                  <input id="mesesNuevo" type="number" min="1" max="11" value={mesesConvenioNuevo}
                    onChange={e => setMesesConvenioNuevo(e.target.value)} className="input-base" placeholder="1-11" />
                </InputField>
              </div>
            )}
          </section>

          {/* Elegir fechas antes de calcular el proporcional. */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">
              Fechas de la licencia
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Seleccioná el rango antes de calcular. En el año del reingreso se cuentan
              los meses completos trabajados hasta el inicio de la licencia, sin exceder ese período.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Fecha desde" id="fechaDesde" required>
                <input id="fechaDesde" type="date" value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)} className="input-base" />
              </InputField>
              <InputField label="Fecha hasta" id="fechaHasta" required>
                <input id="fechaHasta" type="date" value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)} className="input-base" />
              </InputField>
            </div>
            {errorRango && <p className="text-sm text-red-600 dark:text-red-400">⚠️ {errorRango}</p>}
          </section>

          {/* ── Botón calcular ── */}
          <button
            onClick={handleCalcular}
            disabled={!fechaIngreso || !fechaDesde || !fechaHasta || !!errorRango}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition text-base"
          >
            🧮 Calcular días correspondientes
          </button>

          {/* ── Resultado del cálculo ── */}
          {calculo && (
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-200">Resultado del cálculo</h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Antigüedad</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{calculo.antiguedad ?? "—"}</p>
                  <p className="text-xs text-gray-400">años</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Días del período</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{calculo.dias}</p>
                  <p className="text-xs text-gray-400">{calculo.tipo}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Tramo</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{calculo.label || "—"}</p>
                  <p className="text-xs text-gray-400">{calculo.caso}</p>
                </div>
              </div>

              {/* Saldo */}
              {cargandoSaldo && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 animate-pulse">Consultando saldo de días anteriores...</p>
              )}
              {saldo && !cargandoSaldo && (
                <div className={`rounded-xl p-4 border ${
                  saldo.diasDisponibles === 0
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                    : saldo.diasUsados > 0
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                }`}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-600 dark:text-gray-300">
                    Saldo del período {anioVacacional}
                  </p>
                  <div className="flex gap-6 flex-wrap text-sm">
                    <span><span className="font-medium text-gray-700 dark:text-gray-200">Total: </span><span className="font-bold">{saldo.diasCorresponden} días</span></span>
                    <span><span className="font-medium text-gray-700 dark:text-gray-200">Ya usados: </span><span className="font-bold text-amber-600 dark:text-amber-400">{saldo.diasUsados} días</span></span>
                    <span><span className="font-medium text-gray-700 dark:text-gray-200">Disponibles: </span>
                      <span className={`font-bold ${saldo.diasDisponibles === 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        {saldo.diasDisponibles} días
                      </span>
                    </span>
                  </div>
                  {saldo.solicitudesAnteriores.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {saldo.solicitudesAnteriores.length} solicitud(es) previa(s) en este período.
                    </p>
                  )}
                  {saldo.diasDisponibles === 0 && (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-2">
                      ⚠️ El empleado ya agotó todos los días de este período.
                    </p>
                  )}
                </div>
              )}

              {calculo.caso === "reingreso" && (
                <p className="text-xs text-indigo-600 dark:text-indigo-300">
                  📌 Proporcional por reingreso: {calculo.mesesTrabajados} mes(es) trabajados en {anioVacacional}.
                </p>
              )}
              {calculo.caso === "cambioConvenio" && calculo.desglose && (
                <p className="text-xs text-indigo-600 dark:text-indigo-300">
                  📌 {calculo.desglose.convenioAnterior}: {calculo.desglose.diasAnterior} días ({calculo.desglose.mesesAnterior} meses) +{" "}
                  {calculo.desglose.convenioNuevo}: {calculo.desglose.diasNuevo} días ({calculo.desglose.mesesNuevo} meses)
                </p>
              )}
            </div>
          )}

          {/* ── Sección: Rango de fechas de la licencia ── */}
          {calculo && (
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
                Resumen de la licencia
              </h2>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                El rango consume días <strong>{calculo.tipo}</strong> según el convenio{" "}
                <strong>{convenio}</strong>. Si modificás las fechas, volvé a calcular.
              </p>

              {/* Panel de resultado del rango — aparece en cuanto hay fechas válidas */}
              {diasRango && !errorRango && (() => {
                const disponibles = saldo ? saldo.diasDisponibles : calculo.dias;
                const excede = diasRango.cantidad > disponibles;
                const restanDespues = disponibles - diasRango.cantidad;
                return (
                  <div className={`rounded-xl border p-4 space-y-3 ${
                    excede
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                      : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700"
                  }`}>
                    {/* Fila de números clave */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Esta solicitud consume</p>
                        <p className={`text-2xl font-bold ${excede ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {diasRango.cantidad}
                        </p>
                        <p className="text-xs text-gray-400">días {diasRango.tipo}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Disponibles</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{disponibles}</p>
                        <p className="text-xs text-gray-400">días {diasRango.tipo}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quedarían</p>
                        <p className={`text-2xl font-bold ${excede ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white"}`}>
                          {excede ? "—" : restanDespues}
                        </p>
                        <p className="text-xs text-gray-400">días {diasRango.tipo}</p>
                      </div>
                    </div>

                    {/* Detalle del conteo */}
                    <div className="text-xs text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2">
                      {diasRango.tipo === "habiles" ? (
                        <span>
                          📅 Del <strong>{fechaDesde}</strong> al <strong>{fechaHasta}</strong>:{" "}
                          <strong>{diasRango.cantidad} días hábiles</strong> (sin sábados, domingos ni feriados nacionales).
                        </span>
                      ) : (
                        <span>
                          📅 Del <strong>{fechaDesde}</strong> al <strong>{fechaHasta}</strong>:{" "}
                          <strong>{diasRango.cantidad} días corridos</strong>.
                        </span>
                      )}
                    </div>

                    {excede && (
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        ⚠️ El rango seleccionado supera los días disponibles. Ajustá las fechas.
                      </p>
                    )}
                  </div>
                );
              })()}

              <InputField label="Observaciones" id="obs">
                <textarea id="obs" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                  className="input-base resize-none" rows={3} placeholder="Observaciones opcionales..." />
              </InputField>

              <button
                onClick={handleGuardar}
                disabled={guardando || cargandoSaldo || !diasRango || errorRango || (diasRango && (saldo ? diasRango.cantidad > saldo.diasDisponibles : diasRango.cantidad > calculo.dias))}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition text-base"
              >
                {guardando ? "Guardando..." : "💾 Guardar solicitud"}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
