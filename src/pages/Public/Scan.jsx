import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { validarToken, buscarEmpleadoPorLegajo, registrarAsistenciaPorLegajo } from '../../utils/asistencia';
import { llamarApi, SEGURIDAD_ACTIVA } from '../../utils/api';

export default function Scan() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [legajo, setLegajo] = useState('');
  const [empleado, setEmpleado] = useState(null);
  const [valido, setValido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Validando QR…');
  const [resultado, setResultado] = useState(null);
  const operacion = useRef(null);
  const version = useRef(0);
  useEffect(() => {
    let vigente = true;
    setValido(false); setEmpleado(null); setResultado(null); operacion.current = null;
    if (!token) { setMessage('Escanee un QR válido para fichar.'); return; }
    validarToken(token).then(() => { if (vigente) { setValido(true); setMessage('Ingrese su legajo para continuar.'); } })
      .catch(error => { if (vigente) setMessage(error.message); });
    return () => { vigente = false; };
  }, [token]);
  const buscar = async event => {
    event.preventDefault();
    const actual = ++version.current;
    setLoading(true); setEmpleado(null); setMessage('Buscando agente…');
    try {
      const encontrado = SEGURIDAD_ACTIVA
        ? (await llamarApi('fichaje', { accion: 'buscar', token, legajo: legajo.trim() }, false)).empleado
        : await buscarEmpleadoPorLegajo(legajo.trim());
      if (actual !== version.current) return;
      if (!encontrado) throw new Error('Legajo no encontrado. Consulte al administrador de su área.');
      setEmpleado(encontrado); operacion.current = crypto.randomUUID(); setMessage('Verifique sus datos y confirme la asistencia.');
    } catch (error) { if (actual === version.current) setMessage(error.message); }
    finally { if (actual === version.current) setLoading(false); }
  };
  const fichar = async () => {
    if (loading || !empleado || !valido || resultado) return;
    setLoading(true);
    try {
      // Se conserva el ID ante errores de conexión: reintentar no duplica la fichada.
      const data = await registrarAsistenciaPorLegajo(String(empleado.legajo), token, operacion.current);
      setResultado(data); setMessage('Su asistencia quedó registrada.');
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
    <main className="w-full max-w-md space-y-6">
      <header className="text-center"><span className="brand-mark mx-auto mb-4" aria-hidden="true">M</span><h1 className="text-2xl font-bold">Registro de asistencia</h1><p className="mt-2 text-sm text-muted">Municipalidad de Morón</p></header>
      <div className="card p-6 space-y-5">
        <p role="status" aria-live="polite" className="rounded-xl bg-slate-100 p-3 text-sm leading-6">{message}</p>
        {valido && !resultado && <form onSubmit={buscar} className="space-y-3"><label htmlFor="legajo-scan" className="block text-sm font-medium">Número de legajo</label><input id="legajo-scan" className="input-modern w-full" inputMode="numeric" autoComplete="off" value={legajo} disabled={loading} onChange={e => { version.current++; setLegajo(e.target.value.replace(/\D/g,'')); setEmpleado(null); }} maxLength={20} required /><button type="submit" className="btn-primary w-full" disabled={loading || !legajo}>{loading ? 'Procesando…' : 'Buscar agente'}</button></form>}
        {empleado && !resultado && <section className="space-y-4"><div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">{empleado.nombre} {empleado.apellido}</h2><p className="mt-1 text-sm text-muted">Legajo {empleado.legajo}</p><p className="mt-2 text-sm">{empleado.lugarTrabajo}</p></div><button type="button" className="btn-primary w-full" disabled={loading} onClick={fichar}>{loading ? 'Registrando…' : 'Confirmar asistencia'}</button></section>}
        {resultado && <section className="rounded-xl border border-green-200 bg-green-50 p-5 text-center text-green-900"><h2 className="text-lg font-semibold">Asistencia registrada</h2><p className="mt-3 text-2xl font-bold">{resultado.tipo} · {resultado.hora}</p><p className="mt-2 text-sm">{resultado.fecha}</p><p className="mt-4 text-sm">Ya puede cerrar esta ventana.</p></section>}
      </div>
    </main>
  </div>;
}
