import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs } from '../../firebase';
import { fetchAllAreas } from '../../utils/areas';
import { crearSolicitudTraspaso } from '../../utils/traspasos';
import Swal from 'sweetalert2';

const AREA_DISPOSICION = { id: 'disposicion-personal', nombre: 'A Disposición de Personal', ruta: 'A Disposición de Personal' };

export default function SolicitudTraspaso() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [areas, setAreas] = useState([]);
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [busquedaArea, setBusquedaArea] = useState('');
  const [mostrarResultadosAreas, setMostrarResultadosAreas] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [tipo, setTipo] = useState('traspaso_individual');
  const [areaDestino, setAreaDestino] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [necesidades, setNecesidades] = useState([{ funcion: '', cantidad: 1 }]);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [areasData, empSnapshot] = await Promise.all([fetchAllAreas(), getDocs(collection(db, 'empleados'))]);
        setAreas(areasData);
        const areaUsuario = areasData.find(area => area.nombre === user?.lugarTrabajo);
        if (areaUsuario) {
          setAreaDestino(areaUsuario);
        }
        const empleadosData = empSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        setEmpleados(empleadosData);
        const legajo = new URLSearchParams(window.location.search).get('legajo');
        const encontrado = legajo && empleadosData.find(emp => String(emp.legajo) === legajo);
        if (encontrado) seleccionarEmpleado(encontrado);
      } catch (error) { console.error('Error cargando datos:', error); } finally { setLoading(false); }
    };
    cargarDatos();
  }, [user?.lugarTrabajo]);

  const seleccionarEmpleado = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setBusquedaEmpleado(`${empleado.nombre} ${empleado.apellido} (${empleado.legajo})`);
  };
  const seleccionarArea = (area) => {
    setAreaDestino(area);
    setBusquedaArea(area.nombre);
    setMostrarResultadosAreas(false);
  };
  const actualizarNecesidad = (index, campo, valor) => setNecesidades(actuales => actuales.map((item, i) => i === index ? { ...item, [campo]: valor } : item));
  const resetear = () => { setEmpleadoSeleccionado(null); setBusquedaEmpleado(''); setMotivo(''); setObservaciones(''); setNecesidades([{ funcion: '', cantidad: 1 }]); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const esPedido = tipo === 'solicitud_personal';
    const esDisposicion = tipo === 'enviar_disposicion';
    const necesidadesValidas = necesidades.filter(item => item.funcion.trim() && Number(item.cantidad) > 0).map(item => ({ funcion: item.funcion.trim(), cantidad: Number(item.cantidad), cantidadAsignada: 0 }));
    if ((esPedido && (!areaDestino || !necesidadesValidas.length)) || (!esPedido && !empleadoSeleccionado) || (!esDisposicion && !areaDestino)) {
      Swal.fire('⚠️', esPedido ? 'Seleccioná el área solicitante e indicá al menos una función y cantidad.' : 'Debes seleccionar un empleado y un área destino.', 'warning');
      return;
    }
    const origen = empleadoSeleccionado?.area || { id: empleadoSeleccionado?.lugarTrabajo || 'sin-area', nombre: empleadoSeleccionado?.lugarTrabajo || 'Sin área asignada', ruta: empleadoSeleccionado?.lugarTrabajo || '' };
    if (!esPedido && !esDisposicion && origen.id === areaDestino.id) { Swal.fire('⚠️', 'El empleado ya está en esta área.', 'warning'); return; }
    setLoading(true);
    try {
      await crearSolicitudTraspaso({
        tipoSolicitud: tipo,
        empleado: esPedido ? null : { legajo: empleadoSeleccionado.legajo, nombre: `${empleadoSeleccionado.nombre} ${empleadoSeleccionado.apellido}`, funcion: empleadoSeleccionado.funcion || '', areaOrigen: origen },
        areaDestino: esDisposicion ? AREA_DISPOSICION : areaDestino,
        necesidades: esPedido ? necesidadesValidas : [], motivo, observaciones,
        creadoPor: user?.email || '', creadorNombre: `${user?.nombre || ''} ${user?.apellido || ''}`.trim(),
        aprobaciones: { rrhh: { estado: 'pendiente', fecha: null, observaciones: null }, subsecretaria: { estado: 'pendiente', fecha: null, observaciones: null } }
      });
      setSolicitudEnviada(true); resetear();
      Swal.fire('✅', esPedido ? 'Pedido de personal enviado correctamente.' : 'Solicitud creada exitosamente.', 'success');
    } catch (error) { console.error('Error creando solicitud:', error); Swal.fire('❌', `Error al crear la solicitud: ${error.message}`, 'error'); } finally { setLoading(false); }
  };

  const resultadosEmpleados = busquedaEmpleado.length > 1 ? empleados.filter(emp => {
    const perteneceAlArea = !user?.lugarTrabajo || [emp.area?.nombre, emp.lugarTrabajo].filter(Boolean).some(area => area.toLowerCase() === user.lugarTrabajo.toLowerCase());
    const busqueda = busquedaEmpleado.toLowerCase();
    return perteneceAlArea && (`${emp.nombre} ${emp.apellido}`.toLowerCase().includes(busqueda) || String(emp.legajo || '').includes(busqueda));
  }) : [];
  const resultadosAreas = areas.filter(area => `${area.nombre} ${area.ruta || ''}`.toLowerCase().includes(busquedaArea.toLowerCase())).slice(0, 30);
  const titulo = tipo === 'solicitud_personal' ? 'Pedido de Personal' : tipo === 'enviar_disposicion' ? 'Enviar personal a disposición' : 'Solicitud de Traspaso';
  return <div className="app-container"><div className="text-center mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">📝 {titulo}</h1><p className="text-gray-600">Los pedidos requieren aprobación de RRHH y Subsecretaría.</p></div>
    {solicitudEnviada && <div className="card p-4 mb-6 bg-green-50 border border-green-200 text-green-800">✅ Solicitud enviada correctamente.</div>}
    <div className="card p-6 max-w-4xl mx-auto"><form onSubmit={handleSubmit} className="space-y-6">
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo de solicitud *</label><select className="input-modern" value={tipo} onChange={e => { setTipo(e.target.value); setSolicitudEnviada(false); }}><option value="traspaso_individual">Traspasar un empleado a otra área</option><option value="solicitud_personal">Solicitar personal a RRHH</option><option value="enviar_disposicion">Enviar empleado a disposición de Personal</option></select></div>
      {tipo !== 'solicitud_personal' && <div><label className="block text-sm font-medium text-gray-700 mb-2">👤 Empleado *</label><input className="input-modern" placeholder="Buscar por nombre o legajo..." value={busquedaEmpleado} onChange={e => { setBusquedaEmpleado(e.target.value); setEmpleadoSeleccionado(null); }} />
        {resultadosEmpleados.length > 0 && <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">{resultadosEmpleados.map(emp => <button key={emp.id} type="button" className="block w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100" onClick={() => seleccionarEmpleado(emp)}><span className="font-medium">{emp.nombre} {emp.apellido}</span><span className="text-sm text-gray-600"> — Legajo {emp.legajo} · {emp.funcion || 'Sin función'}</span></button>)}</div>}
        {empleadoSeleccionado && <p className="mt-2 p-3 bg-green-50 rounded-lg text-sm text-green-800">✅ {empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido} · Área actual: {empleadoSeleccionado.area?.nombre || empleadoSeleccionado.lugarTrabajo || 'Sin área'}</p>}</div>}
      {tipo !== 'enviar_disposicion' && <div><label className="block text-sm font-medium text-gray-700 mb-2">🏢 {tipo === 'solicitud_personal' ? 'Área solicitante *' : 'Área destino *'}</label><div className="relative"><input className="input-modern" placeholder="Buscar área por nombre..." value={busquedaArea} onFocus={() => setMostrarResultadosAreas(true)} onChange={e => { setBusquedaArea(e.target.value); setAreaDestino(null); setMostrarResultadosAreas(true); }} onBlur={() => setTimeout(() => setMostrarResultadosAreas(false), 150)} />{mostrarResultadosAreas && <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">{resultadosAreas.length > 0 ? resultadosAreas.map(area => <button key={area.id} type="button" className="block w-full border-b border-gray-100 p-3 text-left hover:bg-gray-50" onMouseDown={event => { event.preventDefault(); seleccionarArea(area); }}><span className="font-medium">{area.nombre}</span>{area.ruta && area.ruta !== area.nombre && <span className="block text-sm text-gray-600">{area.ruta}</span>}</button>) : <p className="p-3 text-sm text-gray-500">No se encontraron áreas.</p>}</div>}</div></div>}
      {tipo === 'enviar_disposicion' && <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">📌 El destino será <strong>A Disposición de Personal</strong>.</div>}
      {tipo === 'solicitud_personal' && <div><label className="block text-sm font-medium text-gray-700 mb-2">Funciones y cantidad requerida *</label><div className="space-y-2">{necesidades.map((necesidad, index) => <div className="flex gap-2" key={index}><input className="input-modern flex-1" placeholder="Ej.: Cajero, Pintor, Electricista" value={necesidad.funcion} onChange={e => actualizarNecesidad(index, 'funcion', e.target.value)} /><input className="input-modern w-28" type="number" min="1" value={necesidad.cantidad} onChange={e => actualizarNecesidad(index, 'cantidad', e.target.value)} />{necesidades.length > 1 && <button type="button" className="btn-secondary px-3" onClick={() => setNecesidades(actuales => actuales.filter((_, i) => i !== index))}>Quitar</button>}</div>)}</div><button type="button" className="mt-2 text-sm text-blue-600 hover:text-blue-800" onClick={() => setNecesidades(actuales => [...actuales, { funcion: '', cantidad: 1 }])}>+ Agregar función</button></div>}
      <div><label className="block text-sm font-medium text-gray-700 mb-2">📝 Motivo *</label><textarea className="input-modern" rows="3" required value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explica el motivo..." /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">📋 Observaciones adicionales</label><textarea className="input-modern" rows="2" value={observaciones} onChange={e => setObservaciones(e.target.value)} /></div><button type="submit" disabled={loading} className="w-full btn-primary py-3 disabled:opacity-50">{loading ? 'Procesando...' : '📤 Enviar solicitud'}</button>
    </form></div></div>;
}
