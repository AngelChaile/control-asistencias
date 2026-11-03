import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { buscarEmpleadoPorLegajo } from "../../../utils/asistencia";
import {
  calcularVacaciones, calcularMesesTrabajados, parseFechaLocal, crearSolicitudVacaciones,
  fetchDiasDisponibles, fetchPlanVacacional, calcularDiasRango, resolverRegimenVacacional, perfilVacacionalEmpleado,
  TIPOS_CARGO_VACACIONES, PARTICIONES_VACACIONES, CATEGORIAS_VACACIONES, describirDiasPorTipo,
} from "../../../utils/vacaciones";
import FormularioImpresion from "./FormularioImpresion";
import { mismoPerfilVacacional } from "../../../utils/regimenVacaciones.mjs";

const ANIO_ACTUAL = new Date().getFullYear();
const perfilVacio = () => ({ tipoCargo: "", particion: "", categoria: "" });
const nombreTipo = tipo => tipo === "habiles" ? "hábiles" : "corridos";
function fechaISO(valor) {
  const fecha = parseFechaLocal(valor);
  return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}` : "";
}
const fechaHumana = valor => valor.split("-").reverse().join("-");

function Campo({ label, id, children, hint }) {
  return <div className="flex min-w-0 flex-col gap-1.5"><label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>{children}{hint && <p className="text-xs leading-5 text-gray-500">{hint}</p>}</div>;
}

function PerfilRegimen({ perfil, cambiar, prefijo, bloqueado = false }) {
  const regimen = resolverRegimenVacacional(perfil);
  return <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Tipo de cargo / Planta" id={`${prefijo}-planta`}>
        <select id={`${prefijo}-planta`} className="input-base" value={perfil.tipoCargo} disabled={bloqueado} onChange={e => cambiar({ ...perfil, tipoCargo: e.target.value })}>
          <option value="">Seleccionar planta…</option>
          {!!perfil.tipoCargo && !TIPOS_CARGO_VACACIONES.some(p => p.value === perfil.tipoCargo) && <option value={perfil.tipoCargo}>{perfil.tipoCargo}</option>}
          {TIPOS_CARGO_VACACIONES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </Campo>
      <Campo label="Partición / Convenio" id={`${prefijo}-particion`}>
        <select id={`${prefijo}-particion`} className="input-base" value={perfil.particion} disabled={bloqueado} onChange={e => cambiar({ ...perfil, particion: e.target.value })}>
          <option value="">Seleccionar partición…</option>
          {!!perfil.particion && !PARTICIONES_VACACIONES.some(p => p.value === perfil.particion) && <option value={perfil.particion}>{perfil.particion}</option>}
          {PARTICIONES_VACACIONES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </Campo>
      <div className="sm:col-span-2"><Campo label="Cargo / Categoría" id={`${prefijo}-categoria`} hint={!bloqueado ? "Escribí para buscar la categoría exacta de la planilla." : null}>
        <input id={`${prefijo}-categoria`} className="input-base" value={perfil.categoria} readOnly={bloqueado} list={bloqueado ? undefined : `${prefijo}-categorias`} placeholder="Ej.: ADMINISTRATIVO CAT 5 35 HS" title={perfil.categoria} onChange={e => cambiar({ ...perfil, categoria: e.target.value })} />
        {!bloqueado && <datalist id={`${prefijo}-categorias`}>{CATEGORIAS_VACACIONES.map(c => <option key={c} value={c} />)}</datalist>}
      </Campo></div>
    </div>
    <div className={`rounded-xl border p-3 text-sm ${regimen.encontrado ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      {regimen.encontrado ? <><strong>{regimen.descripcion}</strong><span className="ml-2 text-xs">{regimen.filaFuente ? "Determinado por la planta, partición y categoría de RRHH." : regimen.origen}</span></>
        : regimen.motivo === "datos_incompletos" ? `Completá ${regimen.faltantes.join(", ")} para determinar el régimen.`
        : "Esta combinación de planta, partición y categoría no figura en la planilla. Revisá los datos del agente antes de calcular."}
    </div>
  </div>;
}

export default function SolicitudVacaciones() {
  const { user } = useAuth();
  const legajoRef = useRef(null);
  const consultaRef = useRef(0);
  const busquedaRef = useRef(0);
  const [legajo, setLegajo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [empleadoCargado, setEmpleadoCargado] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [area, setArea] = useState("");
  const [perfilActual, setPerfilActual] = useState(perfilVacio);
  const [perfilAnterior, setPerfilAnterior] = useState(perfilVacio);
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [anioVacacional, setAnioVacacional] = useState(ANIO_ACTUAL);
  const [esReingreso, setEsReingreso] = useState(false);
  const [fechaReingreso, setFechaReingreso] = useState("");
  const [esCambioConvenio, setEsCambioConvenio] = useState(false);
  const [mesesConvenioAnterior, setMesesConvenioAnterior] = useState("");
  const [mesesConvenioNuevo, setMesesConvenioNuevo] = useState("");
  const [calculo, setCalculo] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [tipoDias, setTipoDias] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [solicitudGuardada, setSolicitudGuardada] = useState(null);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [consultandoPlan, setConsultandoPlan] = useState(false);
  const [errorPlan, setErrorPlan] = useState("");
  const [planRecuperado, setPlanRecuperado] = useState(null);
  const [versionEmpleado, setVersionEmpleado] = useState(0);

  useEffect(() => {
    let vigente = true;
    setPlanRecuperado(null); setErrorPlan("");
    if (!empleadoCargado || !Number.isInteger(Number(anioVacacional)) || Number(anioVacacional) < 2020 || Number(anioVacacional) > 2099) { setConsultandoPlan(false); return; }
    setConsultandoPlan(true);
    fetchPlanVacacional(legajo.trim(), Number(anioVacacional)).then(plan => {
      if (!vigente || !plan) return;
      const coincide = mismoPerfilVacacional(plan.perfilActual, perfilActual);
      setPlanRecuperado({ ...plan, coincide });
      if (coincide) {
        setPerfilAnterior(plan.perfilAnterior || perfilVacio());
        setEsCambioConvenio(plan.esCambioConvenio);
        setMesesConvenioAnterior(plan.mesesConvenioAnterior);
        setMesesConvenioNuevo(plan.mesesConvenioNuevo);
        setEsReingreso(plan.esReingreso);
        if (plan.esReingreso) setFechaReingreso(plan.fechaReingreso);
      }
    }).catch(() => { if (vigente) setErrorPlan("No se pudo recuperar el régimen ya aprobado de este año. Volvé a buscar el legajo antes de calcular."); })
      .finally(() => { if (vigente) setConsultandoPlan(false); });
    return () => { vigente = false; };
  }, [empleadoCargado, legajo, anioVacacional, perfilActual.tipoCargo, perfilActual.particion, perfilActual.categoria, versionEmpleado]);

  // Cualquier cambio que afecte derechos obliga a recalcular y consultar saldo.
  useEffect(() => {
    consultaRef.current++;
    setCalculo(null); setSaldo(null); setConsultando(false); setError("");
  }, [legajo, perfilActual, perfilAnterior, fechaIngreso, anioVacacional, esReingreso, fechaReingreso, esCambioConvenio, mesesConvenioAnterior, mesesConvenioNuevo]);
  useEffect(() => () => { consultaRef.current++; busquedaRef.current++; }, []);

  const parametros = { perfilActual, perfilAnterior, fechaIngreso, anioVacacional: Number(anioVacacional), esReingreso, fechaReingreso, esCambioConvenio, mesesConvenioAnterior, mesesConvenioNuevo };
  const regimen = resolverRegimenVacacional(perfilActual);
  const tipoElegido = tipoDias || regimen.tipo;
  const saldoElegido = saldo?.porTipo[tipoElegido];
  let diasRango = null;
  let errorRango = "";
  if (fechaDesde && fechaHasta && tipoElegido) {
    if (fechaDesde > fechaHasta || !parseFechaLocal(fechaDesde) || !parseFechaLocal(fechaHasta)) errorRango = "El rango de fechas no es válido.";
    else diasRango = calcularDiasRango(tipoElegido, fechaDesde, fechaHasta).diasRango;
  }
  const agotado = !!saldo && Object.values(saldo.porTipo).every(s => s.diasDisponibles === 0);

  function cambiarLegajo(valor) {
    busquedaRef.current++; setBuscando(false); setLegajo(valor); setEmpleadoCargado(false);
    setNombreCompleto(""); setArea(""); setFechaIngreso(""); setPerfilActual(perfilVacio());
    setPerfilAnterior(perfilVacio()); setEsCambioConvenio(false); setMesesConvenioAnterior(""); setMesesConvenioNuevo("");
    setEsReingreso(false); setFechaReingreso(""); setTipoDias(""); setFechaDesde(""); setFechaHasta("");
  }

  async function buscarEmpleado() {
    if (!legajo.trim()) { setError("Ingresá el legajo del agente."); return; }
    const busqueda = ++busquedaRef.current;
    const legajoBuscado = legajo.trim();
    setBuscando(true); setError(""); setCalculo(null); setSaldo(null); setEmpleadoCargado(false);
    try {
      const emp = await buscarEmpleadoPorLegajo(legajoBuscado);
      if (busqueda !== busquedaRef.current) return;
      if (!emp) throw new Error(`No se encontró un empleado con legajo ${legajoBuscado}.`);
      setNombreCompleto([emp.apellido, emp.nombre].filter(Boolean).join(", "));
      setArea(emp.area?.nombre || emp.lugarTrabajo || emp.secretaria || "");
      setPerfilActual(perfilVacacionalEmpleado(emp));
      setPerfilAnterior(perfilVacio()); setEsCambioConvenio(false); setMesesConvenioAnterior(""); setMesesConvenioNuevo("");
      setFechaIngreso(fechaISO(emp.fechaIngreso));
      const reingreso = fechaISO(emp.fechaReingreso);
      setFechaReingreso(reingreso);
      setEsReingreso(!!reingreso && Number(reingreso.slice(0, 4)) === Number(anioVacacional));
      setTipoDias(""); setFechaDesde(""); setFechaHasta("");
      setEmpleadoCargado(true);
      setVersionEmpleado(v => v + 1);
    } catch (e) { if (busqueda === busquedaRef.current) setError(e.message || "No se pudieron consultar los datos del agente."); }
    finally { if (busqueda === busquedaRef.current) setBuscando(false); }
  }

  async function calcular() {
    setError(""); setCalculo(null); setSaldo(null);
    if (!legajo.trim()) { setError("Ingresá el legajo antes de calcular."); return; }
    const consulta = ++consultaRef.current;
    setConsultando(true);
    try {
      const resultado = calcularVacaciones(parametros);
      const diasDisponibles = await fetchDiasDisponibles(legajo.trim(), Number(anioVacacional), resultado.diasPorTipo);
      if (consulta !== consultaRef.current) return;
      const disponibles = ["habiles", "corridos"].filter(t => diasDisponibles.porTipo[t].diasDisponibles > 0);
      const preferido = resultado.tipo === "mixto" ? regimen.tipo : resultado.tipo;
      setTipoDias(disponibles.includes(preferido) ? preferido : disponibles[0] || preferido);
      setCalculo(resultado); setSaldo(diasDisponibles);
    } catch (e) { if (consulta === consultaRef.current) setError(e.message || "No se pudo consultar el saldo. Volvé a intentar."); }
    finally { if (consulta === consultaRef.current) setConsultando(false); }
  }

  async function guardar() {
    setError("");
    if (!calculo || !saldoElegido) { setError("Calculá los días y confirmá el saldo antes de guardar."); return; }
    if (!nombreCompleto.trim() || !legajo.trim()) { setError("Completá el nombre y el legajo del agente."); return; }
    if (errorRango || !diasRango || diasRango < 1) { setError(errorRango || "Seleccioná un rango que contenga días de licencia."); return; }
    if (diasRango > saldoElegido.diasDisponibles) { setError(`Sólo quedan ${saldoElegido.diasDisponibles} días ${nombreTipo(tipoElegido)}.`); return; }
    setGuardando(true);
    try {
      const solicitud = await crearSolicitudVacaciones({ ...parametros, legajo: legajo.trim(), nombreCompleto, area, tipoDias: tipoElegido,
        diasSolicitados: diasRango, fechaDesde, fechaHasta, observaciones, solicitadoPor: user?.uid || "" });
      setSolicitudGuardada(solicitud);
    } catch (e) { setError(e.message || "No se pudo guardar la solicitud."); }
    finally { setGuardando(false); }
  }

  function nueva() {
    setSolicitudGuardada(null); setMostrarImpresion(false); setLegajo(""); setEmpleadoCargado(false);
    setNombreCompleto(""); setArea(""); setPerfilActual(perfilVacio()); setPerfilAnterior(perfilVacio());
    setFechaIngreso(""); setAnioVacacional(ANIO_ACTUAL); setEsReingreso(false); setFechaReingreso("");
    setEsCambioConvenio(false); setMesesConvenioAnterior(""); setMesesConvenioNuevo("");
    setTipoDias(""); setFechaDesde(""); setFechaHasta(""); setObservaciones(""); setError("");
  }

  if (mostrarImpresion && solicitudGuardada) return <FormularioImpresion solicitud={solicitudGuardada} onVolver={() => setMostrarImpresion(false)} />;
  if (solicitudGuardada) return <main className="app-container"><div className="card mx-auto max-w-xl space-y-5 p-6">
    <div><p className="page-eyebrow">Solicitud generada</p><h1 className="text-xl font-semibold text-gray-900">{solicitudGuardada.nroSolicitud}</h1></div>
    <div className="space-y-2 text-sm text-gray-700"><p>{solicitudGuardada.nombreCompleto} · Legajo {solicitudGuardada.legajo}</p>
      <p><strong>Solicitados:</strong> {solicitudGuardada.diasSolicitados} días {nombreTipo(solicitudGuardada.tipoDias)}</p>
      <p><strong>Derecho del período:</strong> {describirDiasPorTipo(solicitudGuardada.diasPorTipo)}</p>
      <p>El descuento se efectúa cuando RRHH aprueba la solicitud.</p></div>
    <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" onClick={() => setMostrarImpresion(true)}>Imprimir formulario</button><button type="button" className="btn-secondary" onClick={nueva}>Nueva solicitud</button></div>
  </div></main>;

  return <main className="app-container"><div className="mx-auto max-w-4xl space-y-5">
    <div className="page-heading"><h1 className="text-gray-900">Solicitud de vacaciones</h1><p>Buscá el legajo para identificar automáticamente su régimen de días.</p></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="card space-y-4"><h2 className="text-base font-semibold text-gray-900">Datos del agente</h2>
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-48 flex-1"><Campo label="Legajo" id="legajo"><input ref={legajoRef} id="legajo" className="input-base" value={legajo} placeholder="Ingresá el legajo" disabled={guardando} onChange={e => cambiarLegajo(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); buscarEmpleado(); } }} /></Campo></div><button type="button" className="btn-secondary" disabled={buscando || !legajo.trim() || guardando} onClick={buscarEmpleado}>{buscando ? "Buscando…" : "Buscar agente"}</button></div>
      {empleadoCargado && <p className="text-xs text-green-700">Datos cargados desde el legajo. El régimen usa la categoría, no la función del agente.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nombre completo" id="nombre"><input id="nombre" className="input-base" value={nombreCompleto} readOnly={empleadoCargado} onChange={e => setNombreCompleto(e.target.value)} /></Campo>
        <Campo label="Área / Dependencia" id="area"><input id="area" className="input-base" value={area} readOnly={empleadoCargado} onChange={e => setArea(e.target.value)} /></Campo>
        <Campo label="Fecha de ingreso" id="fechaIngreso"><input id="fechaIngreso" type="date" className="input-base" value={fechaIngreso} readOnly={empleadoCargado} onChange={e => setFechaIngreso(e.target.value)} /></Campo>
        <Campo label="Año vacacional" id="anio"><input id="anio" type="number" min="2020" max="2099" className="input-base" value={anioVacacional} onChange={e => { setAnioVacacional(e.target.value); setEsCambioConvenio(false); setPerfilAnterior(perfilVacio()); setMesesConvenioAnterior(""); setMesesConvenioNuevo(""); if (fechaReingreso) setEsReingreso(Number(fechaReingreso.slice(0, 4)) === Number(e.target.value)); }} /></Campo>
      </div>
    </section>

    <section className="card space-y-4"><h2 className="text-base font-semibold text-gray-900">Situación actual</h2>
      <PerfilRegimen perfil={perfilActual} cambiar={setPerfilActual} prefijo="actual" bloqueado={empleadoCargado} />
      {empleadoCargado && !regimen.encontrado && <p className="text-xs text-gray-600">Completá o corregí los datos desde <Link className="text-municipio-600 underline" to={user?.rol === "admin" ? "/admin/empleados" : "/rrhh/empleados"}>Empleados</Link> y volvé a buscar el legajo.</p>}
    </section>

    <section className="card space-y-4"><h2 className="text-base font-semibold text-gray-900">Situaciones del período</h2>
      {consultandoPlan && <p className="text-xs text-gray-500">Consultando el régimen ya aprobado del año…</p>}
      {errorPlan && <p role="alert" className="text-sm text-red-700">{errorPlan}</p>}
      {planRecuperado && <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">{planRecuperado.coincide
        ? `Se recuperó la configuración del período desde la solicitud aprobada ${planRecuperado.nroSolicitud}. Se conserva el proporcional al volver a solicitar.`
        : `Hay una configuración aprobada (${planRecuperado.nroSolicitud}) para otra situación. Revisá los cambios del período antes de calcular.`}</p>}
      <label className="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" className="mt-0.5" checked={esReingreso} disabled={!!(esReingreso && planRecuperado?.coincide && planRecuperado.esReingreso)} onChange={e => { setEsReingreso(e.target.checked); if (e.target.checked) setEsCambioConvenio(false); }} /><span>Reingreso: el agente dejó de trabajar y volvió durante este período</span></label>
      {esReingreso && <Campo label="Fecha de reingreso" id="reingreso" hint="Se conserva la antigüedad desde el ingreso original y la grilla proporcional configurada."><input id="reingreso" className="input-base max-w-xs" type="date" value={fechaReingreso} onChange={e => setFechaReingreso(e.target.value)} /></Campo>}
      <label className="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" className="mt-0.5" checked={esCambioConvenio} disabled={!!(esCambioConvenio && planRecuperado?.coincide && planRecuperado.esCambioConvenio)} onChange={e => { setEsCambioConvenio(e.target.checked); if (e.target.checked) setEsReingreso(false); }} /><span>Cambio de categoría, planta o convenio en el año vacacional</span></label>
      {esCambioConvenio && <div className="space-y-4 rounded-xl border border-slate-200 p-4">
        <div><h3 className="mb-3 text-sm font-semibold text-gray-900">Situación anterior al cambio</h3><PerfilRegimen perfil={perfilAnterior} cambiar={setPerfilAnterior} prefijo="anterior" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Meses en la situación anterior" id="meses-anterior"><input id="meses-anterior" className="input-base" type="number" min="0" max="12" step="1" value={mesesConvenioAnterior} onChange={e => setMesesConvenioAnterior(e.target.value)} /></Campo>
          <Campo label="Meses en la situación actual" id="meses-actual"><input id="meses-actual" className="input-base" type="number" min="0" max="12" step="1" value={mesesConvenioNuevo} onChange={e => setMesesConvenioNuevo(e.target.value)} /></Campo>
        </div>
        <p className="text-xs leading-5 text-gray-500">Cada tramo se calcula como días anuales × meses ÷ 12, con redondeo al entero más cercano. Si trabajó todo el año, ambos tramos deben sumar 12 meses. Los días hábiles y corridos se mantienen separados.</p>
      </div>}
    </section>

    <button type="button" className="btn-primary w-full" disabled={consultando || consultandoPlan || !!errorPlan || (planRecuperado && !planRecuperado.coincide && !esCambioConvenio && !esReingreso) || buscando || !fechaIngreso || !regimen.encontrado || guardando} onClick={calcular}>{consultando ? "Calculando y consultando saldo…" : "Calcular días y consultar saldo"}</button>

    {calculo && saldo && <>
      <section className="card space-y-4" aria-live="polite"><div><h2 className="text-base font-semibold text-gray-900">Saldo del período {anioVacacional}</h2><p className="mt-1 text-xs text-gray-500">Antigüedad: {calculo.antiguedad} año(s). Se descuentan únicamente las solicitudes aprobadas.</p></div>
        {calculo.desglose && <div className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-gray-700">
          <p><strong>Anterior:</strong> {perfilAnterior.categoria} · {calculo.desglose.mesesAnterior} mes(es) → {calculo.desglose.diasAnterior} días {nombreTipo(calculo.desglose.tipoAnterior)}.</p>
          <p><strong>Actual:</strong> {perfilActual.categoria} · {calculo.desglose.mesesNuevo} mes(es) → {calculo.desglose.diasNuevo} días {nombreTipo(calculo.desglose.tipoNuevo)}.</p>
        </div>}
        <div className="grid gap-4 sm:grid-cols-2">{["habiles", "corridos"].filter(t => saldo.porTipo[t].diasCorresponden > 0 || saldo.porTipo[t].diasUsados > 0).map(t => <div key={t} className={`rounded-xl border p-4 ${saldo.porTipo[t].diasDisponibles ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          <h3 className="mb-3 text-sm font-semibold">Días {nombreTipo(t)}</h3><dl className="grid grid-cols-3 gap-3 text-center"><div><dt className="text-xs">Corresponden</dt><dd className="mt-1 text-xl font-bold">{saldo.porTipo[t].diasCorresponden}</dd></div><div><dt className="text-xs">Aprobados</dt><dd className="mt-1 text-xl font-bold">{saldo.porTipo[t].diasUsados}</dd></div><div><dt className="text-xs">Disponibles</dt><dd className="mt-1 text-xl font-bold">{saldo.porTipo[t].diasDisponibles}</dd></div></dl>
          {saldo.porTipo[t].diasDisponibles === 0 && <p className="mt-3 text-xs">No quedan días {nombreTipo(t)} disponibles en este período.</p>}
        </div>)}</div>
        {agotado && <p role="status" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">El agente agotó los días de vacaciones disponibles para este período.</p>}
        {calculo.caso === "reingreso" && <p className="text-xs text-gray-500">Proporcional por reingreso: {calculo.mesesTrabajados} mes(es) completos.</p>}
      </section>

      <section className="card space-y-4"><h2 className="text-base font-semibold text-gray-900">Fechas de la licencia</h2>
        <fieldset disabled={agotado || guardando} className="space-y-4">
          <Campo label="Saldo del que se descontará esta solicitud" id="tipoDias"><select id="tipoDias" className="input-base" value={tipoElegido} onChange={e => setTipoDias(e.target.value)}>
            {["habiles", "corridos"].filter(t => saldo.porTipo[t].diasCorresponden > 0).map(t => <option key={t} value={t} disabled={saldo.porTipo[t].diasDisponibles === 0}>Días {nombreTipo(t)} — {saldo.porTipo[t].diasDisponibles} disponibles</option>)}
          </select></Campo>
          <p className="text-xs text-gray-500">Esta licencia consume exclusivamente días {nombreTipo(tipoElegido)}. Para usar el otro saldo, generá una solicitud con sus propias fechas.</p>
          <div className="grid gap-4 sm:grid-cols-2"><Campo label="Fecha desde" id="fechaDesde"><input id="fechaDesde" type="date" className="input-base" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} /></Campo><Campo label="Fecha hasta" id="fechaHasta"><input id="fechaHasta" type="date" className="input-base" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} /></Campo></div>
          {errorRango && <p className="text-sm text-red-700">{errorRango}</p>}
          {diasRango !== null && !errorRango && <div className={`rounded-xl border p-4 text-sm ${diasRango > (saldoElegido?.diasDisponibles || 0) ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
            <p>Del <strong>{fechaHumana(fechaDesde)}</strong> al <strong>{fechaHumana(fechaHasta)}</strong>: <strong>{diasRango} días {nombreTipo(tipoElegido)}</strong>{tipoElegido === "habiles" ? " (sin sábados, domingos ni feriados configurados)." : "."}</p>
            <p className="mt-2">Disponibles: <strong>{saldoElegido?.diasDisponibles || 0}</strong> · Quedarían: <strong>{Math.max(0, (saldoElegido?.diasDisponibles || 0) - diasRango)}</strong></p>
            {diasRango > (saldoElegido?.diasDisponibles || 0) && <p className="mt-2 font-semibold">El rango supera el saldo disponible. Ajustá las fechas.</p>}
          </div>}
          <Campo label="Observaciones" id="observaciones"><textarea id="observaciones" className="input-base" rows={3} value={observaciones} onChange={e => setObservaciones(e.target.value)} /></Campo>
          <button type="button" className="btn-primary w-full" disabled={!diasRango || !!errorRango || diasRango > (saldoElegido?.diasDisponibles || 0)} onClick={guardar}>{guardando ? "Guardando…" : "Guardar solicitud"}</button>
        </fieldset>
      </section>
    </>}
  </div></main>;
}
