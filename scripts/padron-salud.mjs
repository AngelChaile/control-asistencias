import XLSX from 'xlsx';
import { categoriaDelCatalogo } from '../src/utils/catalogoCategorias.mjs';
import { createHash } from 'node:crypto';
import { ID_SALUD, secretariaDeArea } from '../src/utils/alcanceAdmin.mjs';
import { normalizarDescripcion } from '../src/utils/regimenVacaciones.mjs';
import { perfilVacacionalEmpleado } from '../src/utils/vacacionesCalculo.mjs';

const categoriasRetiradas = new Set(['ENFERMERA PROFESIONAL A 40 HS','JEFE DE DEPARTAMENTO 40 HS','TEMP ADMINISTRATIVO A 30 HS']);
const texto = valor => String(valor ?? '').trim();
const encabezados = ['Legajo','NroCargo','Apellido','Nombre','Documento','Domicilio','secretaria','areaId','lugarTrabajo','categoria','Tipo Cargo_Descripción','Partición_Descripción','Fecha_Ingreso','Fecha_Reingreso','Fecha_Baja','Fecha_Nacimiento'];

function fechaCivil(valor, fila) {
  const partes = texto(valor).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) throw new Error(`Fecha inválida en la fila ${fila}.`);
  const iso = [partes[3], partes[2], partes[1]].join('-');
  const fecha = new Date(iso + 'T12:00:00Z');
  if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0,10) !== iso) throw new Error(`Fecha inválida en la fila ${fila}.`);
  return iso;
}

export function leerPadron(archivo, { hoy = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Argentina/Buenos_Aires'}).format(new Date()) } = {}) {
  const hoja = XLSX.readFile(archivo).Sheets.Salud;
  if (!hoja) throw new Error('El archivo no contiene la hoja Salud.');
  const [titulos = []] = XLSX.utils.sheet_to_json(hoja, {header:1,range:0});
  if (encabezados.some(h => !titulos.includes(h))) throw new Error('Faltan columnas del padrón de Salud.');
  const filas = XLSX.utils.sheet_to_json(hoja, {defval:''});
  if (!filas.length) throw new Error('La hoja está vacía.');
  const grupos = new Map();
  const legajoPorDocumento = new Map();
  const areas = new Map();
  const pendientes = [];
  let cargosOmitidos = 0;
  for (const r of filas) {
    const fila = r.__rowNum__ + 1;
    const legajo = texto(r.Legajo);
    const documento = texto(r.Documento);
    let areaId = texto(r.areaId);
    let lugarTrabajo = texto(r.lugarTrabajo);
    if (!/^\d+$/.test(legajo) || !/^\d+$/.test(documento) || !texto(r.Nombre) || !texto(r.Apellido) ||
        normalizarDescripcion(r.secretaria) !== 'SALUD' || !/^1\.9\.(?:\d+\.)*$/.test(areaId) || !lugarTrabajo || !texto(r.categoria)) {
      throw new Error(`Identidad, categoría o área inválida en la fila ${fila}.`);
    }
    if (legajoPorDocumento.has(documento) && legajoPorDocumento.get(documento) !== legajo) throw new Error(`Un documento figura en dos legajos en la fila ${fila}.`);
    legajoPorDocumento.set(documento, legajo);
    if (normalizarDescripcion(r['Partición_Descripción']) === 'CARRERA MUNICIPAL' && categoriasRetiradas.has(normalizarDescripcion(r.categoria))) {
      const baja = fechaCivil(r.Fecha_Baja, fila);
      if (baja > hoy) throw new Error('La categoría retirada figura activa en la fila ' + fila);
      cargosOmitidos++;
      continue;
    }
    if (areaId === '1.9.2.2.' && lugarTrabajo === 'DIVISION SUMINISTROS') {
      areaId = '1.9.2.2.7.1.';
    }
    if (areas.has(areaId) && areas.get(areaId) !== lugarTrabajo) throw new Error(`El código de área tiene nombres distintos en la fila ${fila}.`);
    areas.set(areaId, lugarTrabajo);
    const perfil = perfilVacacionalEmpleado({tipoCargo:r['Tipo Cargo_Descripción'],particion:r['Partición_Descripción'],categoria:categoriaDelCatalogo(r.categoria) || texto(r.categoria)});
    const baja = fechaCivil(r.Fecha_Baja, fila);
    const cargo = { nroCargo:texto(r.NroCargo), ...perfil, areaId, lugarTrabajo,
      fechaIngreso:fechaCivil(r.Fecha_Ingreso,fila), fechaReingreso:fechaCivil(r.Fecha_Reingreso,fila), fechaBaja:baja === '2100-01-01' ? '' : baja };
    const persona = { legajo, documento, apellido:texto(r.Apellido), nombre:texto(r.Nombre), domicilio:texto(r.Domicilio),
      fechaNacimiento:fechaCivil(r.Fecha_Nacimiento,fila), ...Object.fromEntries(['email','telefono','funcion'].filter(k=>texto(r[k])).map(k=>[k,texto(r[k])])) };
    const grupo = grupos.get(legajo) || { persona, cargos:[], filas:[] };
    if (grupo.persona.documento !== documento || grupo.cargos.some(c=>c.nroCargo === cargo.nroCargo)) throw new Error(`Documento o número de cargo en conflicto en la fila ${fila}.`);
    grupo.cargos.push(cargo);
    grupo.filas.push(fila);
    grupos.set(legajo, grupo);
  }
  const empleados = [];
  for (const [legajo, { persona, cargos, filas }] of grupos) {
    const vigentes = cargos.filter(c => !c.fechaBaja || c.fechaBaja > hoy);
    const candidatos = vigentes.length ? vigentes : [...cargos].sort((a,b)=>b.fechaBaja.localeCompare(a.fechaBaja)).slice(0,1);
    const perfiles = new Set(candidatos.map(c => JSON.stringify([c.tipoCargo,c.particion,c.categoria,c.areaId])));
    const requiereRevisionCargo = perfiles.size > 1;
    // En una ficha con varios regímenes sólo se consolidan los datos que coinciden.
    const principal = {...candidatos[0]};
    if (requiereRevisionCargo) {
      pendientes.push({ filas, motivo:'RRHH debe seleccionar el cargo para vacaciones.' });
      for (const campo of Object.keys(principal)) {
        if (candidatos.some(c => c[campo] !== principal[campo])) principal[campo] = '';
      }
      principal.lugarTrabajo = [...new Set(candidatos.map(c=>c.lugarTrabajo))].join(' / ');
    }
    const activo = vigentes.length > 0;
    const empleado = { ...persona, ...principal, area:principal.areaId ? {id:principal.areaId,nombre:principal.lugarTrabajo} : null,
      secretaria:'SALUD', secretariaId:ID_SALUD, requiereRevisionCargo, rol:'empleado', activo,
      estado:activo ? 'activo' : 'inactivo', cargosPadron:cargos };
    empleado.huellaPadronSalud = createHash('sha256').update(JSON.stringify(empleado)).digest('hex');
    empleados.push({ empleado, filas });
  }
  return { cantidadFilas:filas.length, empleados, pendientes, areas, cargosOmitidos };
}

// Una reejecución del mismo padrón conserva cualquier edición o traspaso posterior.
export function cambioEmpleado(actual, nuevo) {
  if (!actual) return nuevo;
  if (actual.huellaPadronSalud === nuevo.huellaPadronSalud) return {};
  if (actual.huellaPadronSalud) throw new Error('Ya existe otra versión importada del padrón.');
  if ((actual.documento && texto(actual.documento).replace(/\./g,'') !== nuevo.documento) ||
      (actual.apellido && normalizarDescripcion(actual.apellido) !== normalizarDescripcion(nuevo.apellido)) ||
      (actual.nombre && normalizarDescripcion(actual.nombre) !== normalizarDescripcion(nuevo.nombre))) throw new Error('Revisar la identidad del legajo existente.');
  const alternativas = nuevo.requiereRevisionCargo ? nuevo.cargosPadron : [nuevo];
  const areaActual = actual.area?.id || actual.areaId;
  if ((areaActual && !alternativas.some(c=>c.areaId === areaActual)) ||
      (actual.lugarTrabajo && !alternativas.some(c=>normalizarDescripcion(actual.lugarTrabajo) === normalizarDescripcion(c.lugarTrabajo))) ||
      (actual.secretariaId && actual.secretariaId !== ID_SALUD) ||
      (actual.secretaria && !['SALUD','SECRETARIA DE SALUD'].includes(normalizarDescripcion(actual.secretaria)))) throw new Error('El destino actual difiere del padrón.');
  if ((actual.activo != null && actual.activo !== nuevo.activo) ||
      (actual.estado && normalizarDescripcion(actual.estado) !== normalizarDescripcion(nuevo.estado))) throw new Error('El estado laboral actual difiere del padrón.');
  const perfil = perfilVacacionalEmpleado(actual);
  for (const campo of ['tipoCargo','particion','categoria']) {
    if (perfil[campo] && !alternativas.some(c=>normalizarDescripcion(perfil[campo]) === normalizarDescripcion(c[campo]))) throw new Error('La situación de revista actual difiere del padrón.');
  }
  const cambio = Object.fromEntries(Object.entries(nuevo).filter(([k]) => actual[k] == null || actual[k] === ''));
  if (!secretariaDeArea(actual.area)) cambio.area = nuevo.area;
  return {...cambio, legajo:nuevo.legajo, secretariaId:ID_SALUD, huellaPadronSalud:nuevo.huellaPadronSalud};
}
