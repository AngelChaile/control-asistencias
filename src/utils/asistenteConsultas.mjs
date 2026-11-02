// Consultas deterministas: no generan artículos, fechas ni datos de empleados.
export function normalizar(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

export function alcanceAsistente(perfil) {
  if (["rrhh", "subsecretario"].includes(perfil?.rol)) return { personal: true, area: null };
  if (perfil?.rol === "admin" && perfil.lugarTrabajo?.trim()) {
    return { personal: true, area: perfil.lugarTrabajo.trim() };
  }
  return { personal: false, area: null };
}

const STOP = new Set("a al algo algun alguna algunos ante articulo articulos como con corresponde corresponden cual cuales cuanto cuanta cuantos cuantas de del dias el ella empleado empleados en es ese esta este ha hay la las le les lo los me mi necesito numero o para pedir por puedo que quien se sin sobre son su sus tiene tienen un una unos unas y yo segun convenio municipal medico licencia licencias".split(" "));

export function palabrasBusqueda(pregunta) {
  const texto = normalizar(pregunta)
    .replace(/casamiento|casarse|casar/g, "matrimonio")
    .replace(/vacaciones/g, "descanso anual")
    .replace(/fallecimiento/g, "duelo fallecimiento")
    .replace(/enfermo|enfermarse/g, "enfermedad");
  return [...new Set(texto.match(/[a-z0-9]+/g) || [])].filter(p => p.length > 2 && !STOP.has(p));
}

export function seccionesConvenio(documento) {
  // El OCR puede confundir los ordinales (40º -> 400); se cita la página,
  // sin deducir números de artículo del reconocimiento automático.
  if (documento.id !== "municipal") {
    return documento.paginas.map(p => ({ titulo: `Página PDF ${p.numero}`, paginas: [p.numero], texto: p.texto }));
  }
  const secciones = [];
  let actual = null;
  for (const pagina of documento.paginas) {
    const texto = pagina.texto.replace(/^\s*\d+\s*\n/, "");
    const encabezados = [...texto.matchAll(/^ART[ÍI]CULO\s*(\d+)\s*[.º°-]/gmi)];
    if (!encabezados.length) {
      if (actual) { actual.texto += `\n${texto}`; actual.paginas.push(pagina.numero); }
      continue;
    }
    if (actual && encabezados[0].index > 0) {
      actual.texto += `\n${texto.slice(0, encabezados[0].index)}`;
      actual.paginas.push(pagina.numero);
    }
    encabezados.forEach((match, i) => {
      actual = {
        titulo: `Artículo ${match[1]}`,
        articulo: Number(match[1]),
        paginas: [pagina.numero],
        texto: texto.slice(match.index, encabezados[i + 1]?.index ?? texto.length).trim(),
      };
      secciones.push(actual);
    });
  }
  return secciones;
}

export function buscarEnConvenio(documento, pregunta) {
  const palabras = palabrasBusqueda(pregunta);
  const numero = normalizar(pregunta).match(/art(?:iculo|\.)?\s*(\d+)/)?.[1];
  if (!palabras.length && !numero) return [];
  return seccionesConvenio(documento).map(seccion => {
    const texto = normalizar(seccion.texto);
    const coincidencias = palabras.filter(p => texto.includes(p));
    const porNumero = numero && seccion.articulo === Number(numero);
    const puntuacion = porNumero ? 1000 : coincidencias.length * 10
      + coincidencias.filter(p => texto.slice(0, 160).includes(p)).length * 5
      + coincidencias.filter(p => normalizar(seccion.texto.split("\n")[0]).includes(p)).length * 10;
    const posicion = Math.max(0, texto.indexOf(coincidencias[0] || ""));
    const desde = Math.max(0, posicion - 140);
    const fragmento = `${desde ? "…" : ""}${seccion.texto.replace(/\s+/g, " ").slice(desde, desde + 600)}${seccion.texto.length > desde + 600 ? "…" : ""}`;
    return { ...seccion, puntuacion, fragmento };
  }).filter(s => numero && documento.id === "municipal"
    ? s.articulo === Number(numero) : s.puntuacion > 0)
    .sort((a, b) => b.puntuacion - a.puntuacion).slice(0, 6);
}

export function filtrarPersonal(empleados, filtros) {
  return empleados.filter(emp => {
    const area = normalizar(emp.lugarTrabajo || emp.area?.nombre);
    const localidad = normalizar(emp.localidad); // Nunca deducir residencia del nombre de una calle.
    return (!filtros.area || area === normalizar(filtros.area))
      && (!filtros.tipoCargo || normalizar(emp.tipoCargo) === normalizar(filtros.tipoCargo))
      && (!filtros.localidad || localidad === normalizar(filtros.localidad))
      && (!filtros.funcion || normalizar(emp.funcion).includes(normalizar(filtros.funcion)))
      && (filtros.incluirInactivos || (emp.activo !== false && normalizar(emp.estado) !== "inactivo"));
  }).sort((a, b) => normalizar(`${a.apellido} ${a.nombre}`).localeCompare(normalizar(`${b.apellido} ${b.nombre}`)));
}

export function fechaRegistro(valor) {
  const texto = String(valor || "");
  const local = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const partes = local ? [Number(local[3]), Number(local[2]), Number(local[1])]
    : iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : null;
  if (!partes) return null;
  const [anio, mes, dia] = partes;
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function rankingAusencias(registros, filtros) {
  const agrupados = new Map();
  const duplicados = new Set();
  let sinFecha = 0;
  let sinLegajo = 0;
  for (const reg of registros) {
    const fecha = fechaRegistro(reg.fecha);
    if (!fecha) { sinFecha++; continue; }
    if (fecha.slice(0, 7) !== filtros.mes) continue;
    if (filtros.area && normalizar(reg.lugarTrabajo) !== normalizar(filtros.area)) continue;
    const legajo = String(reg.legajo ?? "").trim();
    if (!legajo) { sinLegajo++; continue; }
    const clave = `${legajo}|${fecha}`;
    // La misma ausencia se puede cargar más de una vez: cuenta una vez por fecha.
    if (duplicados.has(clave)) continue;
    duplicados.add(clave);
    const item = agrupados.get(legajo) || {
      legajo, nombre: [reg.nombre, reg.apellido].filter(Boolean).join(" ") || "Sin nombre registrado",
      area: reg.lugarTrabajo || "Sin área registrada", dias: 0,
    };
    item.dias++;
    agrupados.set(legajo, item);
  }
  const filas = [...agrupados.values()].sort((a, b) => b.dias - a.dias || a.nombre.localeCompare(b.nombre));
  return { filas, sinFecha, sinLegajo, totalDias: duplicados.size };
}
