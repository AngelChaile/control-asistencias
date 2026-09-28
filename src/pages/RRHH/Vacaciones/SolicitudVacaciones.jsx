// src/pages/RRHH/Vacaciones/SolicitudVacaciones.jsx
import React, { useState, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  calcularVacaciones,
  calcularMesesTrabajados,
  parseFechaLocal,
  calcularAntiguedad,
  crearSolicitudVacaciones,
  fetchDiasDisponibles,
  TABLAS_CONVENIO,
} from "../../../utils/vacaciones";
import FormularioImpresion from "./FormularioImpresion";

const CONVENIOS = Object.keys(TABLAS_CONVENIO);
const ANIO_ACTUAL = new Date().getFullYear();

function InputField({ label, id, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export default function SolicitudVacaciones() {
  const { user } = useAuth();

  // ── Datos del agente ──────────────────────────────────────────────
  const [legajo, setLegajo] = useState("");
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
  const [esCambioConvenio, setEsCambioConvenio] = useState(false);
  const [convenioAnterior, setConvenioAnterior] = useState("");
  const [mesesConvenioAnterior, setMesesConvenioAnterior] = useState("");
  const [mesesConvenioNuevo, setMesesConvenioNuevo] = useState("");

  // ── Solicitud ─────────────────────────────────────────────────────
  const [diasSolicitados, setDiasSolicitados] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // ── Estado UI ─────────────────────────────────────────────────────
  const [calculo, setCalculo] = useState(null);
  const [saldo, setSaldo] = useState(null);          // { diasCorresponden, diasUsados, diasDisponibles }
  const [cargandoSaldo, setCargandoSaldo] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [solicitudGuardada, setSolicitudGuardada] = useState(null);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);

  // ── Calcular días + consultar saldo ──────────────────────────────
  const handleCalcular = useCallback(async () => {
    setError("");
    setCalculo(null);
    setSaldo(null);

    if (!fechaIngreso) { setError("Ingresá la fecha de ingreso."); return; }
    if (!convenio)     { setError("Seleccioná un convenio."); return; }
    if (esReingreso && !fechaReingreso) { setError("Ingresá la fecha de reingreso."); return; }
    if (esCambioConvenio && !convenioAnterior) { setError("Seleccioná el convenio anterior."); return; }

    try {
      const resultado = calcularVacaciones({
        convenio,
        fechaIngreso,
        anioVacacional: Number(anioVacacional),
        esReingreso,
        fechaReingreso: esReingreso ? fechaReingreso : null,
        esCambioConvenio,
        convenioAnterior: esCambioConvenio ? convenioAnterior : null,
        mesesConvenioAnterior: esCambioConvenio ? Number(mesesConvenioAnterior) : 0,
        mesesConvenioNuevo: esCambioConvenio ? Number(mesesConvenioNuevo) : 0,
      });

      // Calcular antigüedad para mostrar
      const ingreso = parseFechaLocal(fechaIngreso);
      const ref = new Date(Number(anioVacacional), 11, 31);
      const antiguedad = calcularAntiguedad(ingreso, ref);

      // Meses trabajados para reingreso
      let mesesInfo = null;
      if (esReingreso && fechaReingreso) {
        mesesInfo = calcularMesesTrabajados(fechaReingreso, Number(anioVacacional));
      }

      setCalculo({ ...resultado, antiguedad, mesesInfo });

      // Consultar saldo si hay legajo cargado
      if (legajo) {
        setCargandoSaldo(true);
        try {
          const saldoData = await fetchDiasDisponibles(legajo, Number(anioVacacional), resultado.dias);
          setSaldo(saldoData);
        } catch {
          // saldo no crítico, no bloquea el flujo
        } finally {
          setCargandoSaldo(false);
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }, [
    convenio, fechaIngreso, anioVacacional, legajo,
    esReingreso, fechaReingreso,
    esCambioConvenio, convenioAnterior, mesesConvenioAnterior, mesesConvenioNuevo,
  ]);

  // ── Guardar solicitud ─────────────────────────────────────────────
  const handleGuardar = async () => {
    setError("");
    if (!legajo)          { setError("Ingresá el legajo."); return; }
    if (!nombreCompleto)  { setError("Ingresá el nombre completo."); return; }
    if (!calculo)         { setError("Primero calculá los días correspondientes."); return; }
    if (!diasSolicitados) { setError("Ingresá la cantidad de días solicitados."); return; }

    // Validación contra saldo disponible (si ya se consultó) o contra el total calculado
    const diasMax = saldo ? saldo.diasDisponibles : calculo.dias;
    if (Number(diasSolicitados) > diasMax) {
      const msg = saldo && saldo.diasUsados > 0
        ? `El empleado ya usó ${saldo.diasUsados} días este período. Solo quedan ${saldo.diasDisponibles} días disponibles.`
        : `No podés solicitar más días de los que corresponden (${calculo.dias}).`;
      setError(msg);
      return;
    }
    if (Number(diasSolicitados) < 1) {
      setError("La cantidad de días solicitados debe ser al menos 1.");
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
        diasSolicitados: Number(diasSolicitados),
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
    setSolicitudGuardada(null);
    setCalculo(null);
    setSaldo(null);
    setLegajo(""); setNombreCompleto(""); setCargo(""); setArea("");
    setConvenio("Municipal"); setEsJerarquico(false); setFechaIngreso("");
    setAnioVacacional(ANIO_ACTUAL); setEsReingreso(false); setFechaReingreso("");
    setEsCambioConvenio(false); setConvenioAnterior(""); setMesesConvenioAnterior("");
    setMesesConvenioNuevo(""); setDiasSolicitados(""); setFechaDesde("");
    setFechaHasta(""); setObservaciones(""); setError("");
  };

  // ── Vista de impresión ────────────────────────────────────────────
  if (mostrarImpresion && solicitudGuardada) {
    return (
      <FormularioImpresion
        solicitud={solicitudGuardada}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  // ── Solicitud guardada con éxito ──────────────────────────────────
  if (solicitudGuardada) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Solicitud generada
          </h2>
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
            <button
              onClick={() => setMostrarImpresion(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition"
            >
              🖨️ Imprimir formulario
            </button>
            <button
              onClick={handleNueva}
              className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-xl transition"
            >
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            📋 Solicitud de Licencia Anual Ordinaria
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Completá los datos del agente para generar la solicitud de vacaciones.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-6">
          {/* ── Sección: Datos del agente ── */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
              Datos del agente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Legajo" id="legajo" required>
                <input id="legajo" type="text" value={legajo} onChange={e => setLegajo(e.target.value)}
                  className="input-base" placeholder="Ej: 1234" />
              </InputField>
              <InputField label="Nombre completo" id="nombre" required>
                <input id="nombre" type="text" value={nombreCompleto} onChange={e => setNombreCompleto(e.target.value)}
                  className="input-base" placeholder="Apellido, Nombre" />
              </InputField>
              <InputField label="Cargo" id="cargo">
                <input id="cargo" type="text" value={cargo} onChange={e => setCargo(e.target.value)}
                  className="input-base" placeholder="Ej: Administrativo" />
              </InputField>
              <InputField label="Área / Secretaría" id="area">
                <input id="area" type="text" value={area} onChange={e => setArea(e.target.value)}
                  className="input-base" placeholder="Ej: Sec. de Salud" />
              </InputField>
              <InputField label="Convenio" id="convenio" required>
                <select id="convenio" value={convenio} onChange={e => setConvenio(e.target.value)} className="input-base">
                  {CONVENIOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </InputField>
              <InputField label="Fecha de ingreso" id="fechaIngreso" required>
                <input id="fechaIngreso" type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)}
                  className="input-base" />
              </InputField>
              <InputField label="Año vacacional" id="anio" required>
                <input id="anio" type="number" value={anioVacacional} onChange={e => setAnioVacacional(e.target.value)}
                  className="input-base" min="2020" max="2099" />
              </InputField>
              {convenio === "Municipal" && (
                <InputField label="¿Cargo jerárquico?" id="jerarquico">
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={esJerarquico} onChange={e => setEsJerarquico(e.target.checked)}
                      className="w-4 h-4 rounded" />
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={esReingreso} onChange={e => { setEsReingreso(e.target.checked); if (e.target.checked) setEsCambioConvenio(false); }}
                className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reingreso (dejó de trabajar y volvió)
              </span>
            </label>
            {esReingreso && (
              <div className="ml-6 mt-2">
                <InputField label="Fecha de reingreso" id="fechaReingreso" required
                  hint="Se calculará el proporcional según la grilla oficial.">
                  <input id="fechaReingreso" type="date" value={fechaReingreso} onChange={e => setFechaReingreso(e.target.value)}
                    className="input-base max-w-xs" />
                </InputField>
              </div>
            )}

            {/* Cambio de convenio */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={esCambioConvenio} onChange={e => { setEsCambioConvenio(e.target.checked); if (e.target.checked) setEsReingreso(false); }}
                className="w-4 h-4 rounded" />
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

          {/* ── Botón calcular ── */}
          <button
            onClick={handleCalcular}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition text-base"
          >
            🧮 Calcular días correspondientes
          </button>

          {/* ── Resultado del cálculo ── */}
          {calculo && (
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-200">Resultado del cálculo</h3>

              {/* Fila principal */}
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

              {/* Saldo de días */}
              {cargandoSaldo && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 animate-pulse">
                  Consultando saldo de días anteriores...
                </p>
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
                    <span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Total: </span>
                      <span className="font-bold">{saldo.diasCorresponden} días</span>
                    </span>
                    <span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Ya usados: </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{saldo.diasUsados} días</span>
                    </span>
                    <span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">Disponibles: </span>
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

              {/* Notas de casos especiales */}
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

          {/* ── Sección: Datos de la solicitud ── */}
          {calculo && (
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
                Datos de la solicitud
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField label="Días solicitados" id="diasSol" required
                  hint={
                    saldo
                      ? `Disponibles: ${saldo.diasDisponibles} de ${saldo.diasCorresponden} días ${calculo.tipo}`
                      : `Máximo: ${calculo.dias} días ${calculo.tipo}`
                  }>
                  <input
                    id="diasSol" type="number" min="1"
                    max={saldo ? saldo.diasDisponibles : calculo.dias}
                    value={diasSolicitados}
                    onChange={e => setDiasSolicitados(e.target.value)}
                    className="input-base"
                    disabled={saldo && saldo.diasDisponibles === 0}
                  />
                </InputField>
                <InputField label="Fecha desde" id="fechaDesde">
                  <input id="fechaDesde" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                    className="input-base" />
                </InputField>
                <InputField label="Fecha hasta" id="fechaHasta">
                  <input id="fechaHasta" type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                    className="input-base" />
                </InputField>
              </div>
              <InputField label="Observaciones" id="obs">
                <textarea id="obs" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                  className="input-base resize-none" rows={3} placeholder="Observaciones opcionales..." />
              </InputField>

              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-base"
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
