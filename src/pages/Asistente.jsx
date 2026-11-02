import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAllAreas } from "../utils/areas";
import { consultarDatosAsistente } from "../utils/asistente";
import { alcanceAsistente, buscarEnConvenio } from "../utils/asistenteConsultas.mjs";
import municipal from "../data/convenios/municipal.json";
import medico from "../data/convenios/medico.json";

const DOCUMENTOS = { municipal, medico };
const TITULOS = { municipal: "Convenio Colectivo Municipal", medico: "Convenio Médico" };
const mesActual = () => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit",
}).format(new Date());
const filtrosIniciales = () => ({ area: "", tipoCargo: "", localidad: "", funcion: "", mes: mesActual(), incluirInactivos: false });

function Campo({ titulo, children }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">{titulo}{children}</label>;
}

function TablaPersonal({ resultado }) {
  const [pagina, setPagina] = useState(1);
  const paginas = Math.max(1, Math.ceil(resultado.filas.length / 25));
  return <>
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
          {["Agente", "Legajo", "Área", "Situación", "Función", "Localidad"].map(t => <th key={t} scope="col" className="px-4 py-3">{t}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {resultado.filas.slice((pagina - 1) * 25, pagina * 25).map(emp => <tr key={emp.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 font-medium text-slate-900">{emp.apellido} {emp.nombre}</td>
            <td className="px-4 py-3 tabular-nums">{emp.legajo || "—"}</td>
            <td className="px-4 py-3">{emp.lugarTrabajo || emp.area?.nombre || "—"}</td>
            <td className="px-4 py-3 capitalize">{emp.tipoCargo || "Sin dato"}</td>
            <td className="px-4 py-3">{emp.funcion || "—"}</td>
            <td className="px-4 py-3">{emp.localidad || "Sin cargar"}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {paginas > 1 && <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <button type="button" className="btn-secondary" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
      <span>Página {pagina} de {paginas}</span>
      <button type="button" className="btn-secondary" disabled={pagina === paginas} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
    </div>}
  </>;
}

export default function Asistente() {
  const { user } = useAuth();
  const alcance = alcanceAsistente(user);
  const [vista, setVista] = useState("convenios");
  const [convenio, setConvenio] = useState("municipal");
  const [pregunta, setPregunta] = useState("");
  const [busqueda, setBusqueda] = useState(null);
  const [tipo, setTipo] = useState("personal");
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [areas, setAreas] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const consultaActual = useRef(0);

  useEffect(() => {
    consultaActual.current++;
    setCargando(false);
    setResultado(null);
    setFiltros(filtrosIniciales());
    if (!alcance.personal) setVista("convenios");
    return () => { consultaActual.current++; };
  }, [user?.uid, user?.rol, user?.lugarTrabajo]);

  useEffect(() => {
    let vigente = true;
    if (alcance.personal && !alcance.area) {
      fetchAllAreas().then(datos => { if (vigente) setAreas(datos); })
        .catch(() => { /* El área también se puede escribir sin cargar el catálogo. */ });
    }
    return () => { vigente = false; };
  }, [alcance.personal, alcance.area]);

  function cambiarFiltro(campo, valor) {
    setFiltros(actual => ({ ...actual, [campo]: valor }));
    setResultado(null);
    setError("");
  }

  function buscarConvenio(event) {
    event?.preventDefault();
    if (!pregunta.trim()) return;
    setBusqueda({ pregunta: pregunta.trim(), convenio, filas: buscarEnConvenio(DOCUMENTOS[convenio], pregunta) });
  }

  async function consultar(event) {
    event.preventDefault();
    const consulta = ++consultaActual.current;
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      const datos = await consultarDatosAsistente(tipo, { ...filtros, area: alcance.area || filtros.area.trim() });
      if (consulta !== consultaActual.current) return;
      setResultado(datos);
      setVersion(v => v + 1);
    } catch (err) {
      if (consulta !== consultaActual.current) return;
      setError(err.code === "permission-denied"
        ? "Firebase no permite esta consulta con tu perfil. RRHH debe revisar los permisos de acceso."
        : err.message || "No se pudo completar la consulta. Volvé a intentar.");
    } finally { if (consulta === consultaActual.current) setCargando(false); }
  }

  function ejemploDatos(ejemplo) {
    setVista("datos");
    setTipo(ejemplo === "ausencias" ? "ausencias" : "personal");
    setFiltros({ ...filtrosIniciales(), tipoCargo: ejemplo === "temporarios" ? "temporario" : "", localidad: ejemplo === "localidad" ? "Morón" : "" });
    setResultado(null);
    setError("");
  }

  return <main className="app-container space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-municipio-50 text-2xl text-municipio-600">✦</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-municipio-600">Asistente de trabajo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">La información que necesitás, en un lugar</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Buscá artículos de los convenios y consultá registros del sistema. Esta versión utiliza búsquedas y filtros guiados, sin un servicio de IA externo.</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-50 px-3 py-1.5">Documentos con referencia de página</span>
        <span className="rounded-full bg-slate-50 px-3 py-1.5">{alcance.personal ? alcance.area ? `Datos de tu área: ${alcance.area}` : "Datos de todas las áreas" : "Consultas de convenios"}</span>
      </div>
    </section>

    <div className="flex gap-2 border-b border-slate-200" role="tablist" aria-label="Tipo de consulta">
      {[{ id: "convenios", label: "Convenios y licencias" }, ...(alcance.personal ? [{ id: "datos", label: "Personal y ausencias" }] : [])].map(tab =>
        <button key={tab.id} type="button" role="tab" aria-selected={vista === tab.id} aria-controls={`panel-${tab.id}`} id={`tab-${tab.id}`} onClick={() => { setVista(tab.id); setError(""); }}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${vista === tab.id ? "border-municipio-500 text-municipio-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{tab.label}</button>)}
    </div>

    {vista === "convenios" ? <section id="panel-convenios" role="tabpanel" aria-labelledby="tab-convenios" className="space-y-5">
      <form onSubmit={buscarConvenio} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-[17rem_1fr]">
          <Campo titulo="Convenio a consultar"><select value={convenio} onChange={e => { setConvenio(e.target.value); setBusqueda(null); }} className="input-base">
            {Object.entries(TITULOS).map(([id, titulo]) => <option key={id} value={id}>{titulo}</option>)}
          </select></Campo>
          <Campo titulo="¿Qué necesitás saber?"><input value={pregunta} maxLength={350} onChange={e => setPregunta(e.target.value)} placeholder="Ej.: ¿Qué artículo corresponde por casamiento?" className="input-base" /></Campo>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{convenio === "municipal" ? "Podés buscar por tema, palabras clave o número de artículo." : "Buscá por tema o palabras clave. Se referencia la página del escaneo."}</p>
          <button type="submit" disabled={!pregunta.trim()} className="btn-primary disabled:opacity-50">Buscar en el convenio</button>
        </div>
      </form>

      {!busqueda && <div className="grid gap-3 sm:grid-cols-3">
        {["¿Cuántos días corresponden por casamiento?", "¿Qué artículo corresponde por enfermedad?", "Licencia por estudio"].map(ejemplo => <button key={ejemplo} type="button" onClick={() => {
          setPregunta(ejemplo);
          setBusqueda({ pregunta: ejemplo, convenio, filas: buscarEnConvenio(DOCUMENTOS[convenio], ejemplo) });
        }} className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 transition hover:border-municipio-300 hover:bg-slate-50">{ejemplo}<span aria-hidden="true" className="mt-3 block text-municipio-500">Consultar →</span></button>)}
      </div>}

      <p className="text-xs leading-5 text-slate-500">Se muestran pasajes de la copia incorporada de cada convenio. La búsqueda no certifica su vigencia ni reemplaza la revisión de RRHH. {convenio === "medico" && "El convenio médico proviene de un escaneo: el texto y la numeración pueden contener errores de OCR; contrastalos con el original."}</p>

      {busqueda && <div aria-live="polite" className="space-y-4">
        <div><h2 className="text-lg font-semibold text-slate-900">{busqueda.filas.length ? "Pasajes encontrados" : "No encontré un pasaje relacionado"}</h2>
          <p className="mt-1 text-sm text-slate-500">{busqueda.filas.length ? `Búsqueda: ${busqueda.pregunta}` : "Probá un término más específico o elegí otro convenio. No se infiere una respuesta cuando falta información."}</p></div>
        {busqueda.filas.map((pasaje, i) => <article key={`${busqueda.convenio}-${i}`} className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="rounded-md bg-municipio-50 px-2 py-1 font-semibold text-municipio-700">{pasaje.titulo}</span>
            <span>{TITULOS[busqueda.convenio]} · {pasaje.paginas.length > 1 ? "Páginas PDF" : "Página PDF"} {pasaje.paginas.join(", ")}</span>
            {busqueda.convenio === "medico" && <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">Texto por OCR</span>}
          </div>
          <p className="text-sm leading-7 text-slate-700">{pasaje.fragmento}</p>
          <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-sm font-medium text-municipio-600">Leer el pasaje completo</summary>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{pasaje.texto}</p>
          </details>
        </article>)}
      </div>}
    </section> : <section id="panel-datos" role="tabpanel" aria-labelledby="tab-datos" className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[{ id: "temporarios", label: "Temporarios de un área" }, { id: "ausencias", label: "Más ausencias este mes" }, { id: "localidad", label: "Empleados que viven en Morón" }].map(ej => <button key={ej.id} type="button" disabled={cargando} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => ejemploDatos(ej.id)}>{ej.label}</button>)}
      </div>
      <form onSubmit={consultar} className="card space-y-4">
        <fieldset disabled={cargando} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo titulo="Qué querés consultar"><select value={tipo} onChange={e => { setTipo(e.target.value); setResultado(null); }} className="input-base"><option value="personal">Listado de empleados</option><option value="ausencias">Mayor cantidad de ausencias registradas</option></select></Campo>
            <Campo titulo="Área de trabajo"><input list={alcance.area ? undefined : "areas-asistente"} value={alcance.area || filtros.area} readOnly={!!alcance.area} onChange={e => cambiarFiltro("area", e.target.value)} className="input-base" placeholder="Todas las áreas; escribí para buscar" />
              {!alcance.area && <datalist id="areas-asistente">{areas.map(a => <option key={a.id} value={a.nombre} />)}</datalist>}
            </Campo>
          </div>
          {tipo === "personal" ? <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo titulo="Situación de revista"><select className="input-base" value={filtros.tipoCargo} onChange={e => cambiarFiltro("tipoCargo", e.target.value)}><option value="">Todas</option><option value="temporario">Temporario</option><option value="permanente">Planta permanente</option><option value="contratado">Docente provisional</option><option value="pasantia">Pasantía</option></select></Campo>
              <Campo titulo="Localidad de residencia"><input value={filtros.localidad} onChange={e => cambiarFiltro("localidad", e.target.value)} placeholder="Ej.: Morón" className="input-base" /></Campo>
              <Campo titulo="Función"><input value={filtros.funcion} onChange={e => cambiarFiltro("funcion", e.target.value)} placeholder="Ej.: Pintor" className="input-base" /></Campo>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={filtros.incluirInactivos} onChange={e => cambiarFiltro("incluirInactivos", e.target.checked)} /> Incluir empleados inactivos</label>
          </> : <div className="grid gap-4 sm:grid-cols-2"><Campo titulo="Mes a consultar"><input type="month" required value={filtros.mes} onChange={e => cambiarFiltro("mes", e.target.value)} className="input-base" /></Campo>
            <p className="self-end text-xs leading-5 text-slate-500">Cuenta un día por legajo y fecha de la colección de ausencias, incluyendo justificadas e injustificadas. La falta de una fichada no se considera una ausencia registrada.</p></div>}
          <div className="flex justify-end"><button className="btn-primary disabled:opacity-50" type="submit">{cargando ? "Consultando registros…" : "Consultar datos"}</button></div>
        </fieldset>
      </form>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {resultado && <div className="card space-y-4" aria-live="polite">
        <div><h2 className="text-lg font-semibold text-slate-900">{resultado.tipo === "personal" ? `${resultado.filas.length} empleado(s) encontrado(s)` : `${resultado.totalDias} día(s) de ausencia registrados`}</h2>
          <p className="mt-1 text-xs text-slate-500">Fuente: {resultado.tipo === "personal" ? "Empleados" : "Ausencias"} · {resultado.area || "Todas las áreas"}{resultado.mes ? ` · ${resultado.mes.split("-").reverse().join("-")}` : ""} · Consultado: {resultado.consultadoEn.toLocaleString("es-AR")}</p>
        </div>
        {resultado.tipo === "personal" && resultado.sinLocalidad > 0 && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Hay {resultado.sinLocalidad} registro(s) sin localidad cargada en el área consultada. Las búsquedas de residencia sólo incluyen la localidad explícita del empleado; no se deduce del domicilio. Podés completar ese dato desde Empleados.</p>}
        {resultado.tipo === "ausencias" && (resultado.sinFecha > 0 || resultado.sinLegajo > 0) && <p className="text-xs text-amber-700">Se excluyeron {resultado.sinFecha} registro(s) con fecha no válida y {resultado.sinLegajo} del período sin legajo.</p>}
        {!resultado.filas.length ? <p className="py-6 text-center text-sm text-slate-500">No hay registros que coincidan con estos filtros.</p>
          : resultado.tipo === "personal" ? <TablaPersonal key={version} resultado={resultado} />
          : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Agente", "Legajo", "Área", "Días registrados"].map(t => <th key={t} scope="col" className="px-4 py-3">{t}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{resultado.filas.map(fila => <tr key={fila.legajo}><td className="px-4 py-3 font-medium text-slate-900">{fila.nombre}</td><td className="px-4 py-3">{fila.legajo}</td><td className="px-4 py-3">{fila.area}</td><td className="px-4 py-3 font-semibold tabular-nums">{fila.dias}</td></tr>)}</tbody></table></div>}
      </div>}
    </section>}
  </main>;
}
