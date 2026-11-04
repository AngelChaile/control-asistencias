import React, { useEffect, useState } from 'react';
import { llamarApi } from '../../utils/api';

const vacio = () => ({ email:'', nombre:'', apellido:'', legajo:'', lugarTrabajo:'', secretaria:'', rol:'empleado', activo:true, avisosTraspasos:[] });
const avisos = [ ['actualizar_sistemas','Actualizar Major y Portal Empleados'], ['notificar_empleado','Notificar al empleado su nuevo destino'] ];
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfil, setPerfil] = useState(vacio);
  const [uid, setUid] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const cargar = async () => setUsuarios((await llamarApi('usuarios', {accion:'listar'})).usuarios);
  useEffect(() => { cargar().catch(e => setError(e.message)); }, []);
  const reset = () => { setPerfil(vacio()); setUid(null); setPassword(''); };
  const guardar = async event => {
    event.preventDefault(); setLoading(true); setError(''); setMensaje('');
    try {
      await llamarApi('usuarios', {accion:uid ? 'actualizar' : 'crear', uid, perfil, password:password || undefined});
      reset(); await cargar(); setMensaje('Cuenta y perfil guardados correctamente.');
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };
  const desactivar = async usuario => {
    if (!window.confirm(`¿Desactivar el acceso de ${usuario.nombre} ${usuario.apellido}?`)) return;
    setLoading(true); setError('');
    try { await llamarApi('usuarios', {accion:'desactivar', uid:usuario.id}); await cargar(); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <div className="app-container space-y-6">
    <header className="page-heading"><h1 className="text-3xl font-bold">Usuarios del sistema</h1><p className="mt-2 text-muted">Cuentas, permisos por área y responsabilidades de notificación.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    {mensaje && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">{mensaje}</p>}
    <section className="card p-6"><h2 className="mb-5 text-lg font-semibold">{uid ? 'Editar cuenta' : 'Crear cuenta'}</h2><form onSubmit={guardar} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['email','Correo','email'],['nombre','Nombre','text'],['apellido','Apellido','text'],['legajo','Legajo','text'],['lugarTrabajo','Área / Lugar de trabajo','text'],['secretaria','Secretaría','text']].map(([key,label,type]) => <label key={key} className="space-y-2 text-sm font-medium">{label}<input className="input-modern block w-full" type={type} required={['email','nombre','apellido'].includes(key) || (key==='lugarTrabajo' && perfil.rol==='admin')} value={perfil[key]} maxLength={250} onChange={e => setPerfil({...perfil,[key]:e.target.value})} /></label>)}
        <label className="space-y-2 text-sm font-medium">Rol<select className="input-modern block w-full" value={perfil.rol} onChange={e=>setPerfil({...perfil,rol:e.target.value})}><option value="empleado">Empleado</option><option value="admin">Administrador de área</option><option value="rrhh">Recursos Humanos</option><option value="subsecretario">Subsecretario</option></select></label>
        <label className="space-y-2 text-sm font-medium">{uid ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}<input type="password" className="input-modern block w-full" value={password} autoComplete="new-password" minLength={8} maxLength={128} required={!uid} onChange={e=>setPassword(e.target.value)} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={perfil.activo} onChange={e=>setPerfil({...perfil,activo:e.target.checked})} />Cuenta habilitada</label>
      </div>
      <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold">Avisos de traspasos</legend><p className="mb-3 text-sm text-muted">Recibe estos avisos además de los correspondientes a su área. No otorga permisos de aprobación.</p><div className="flex flex-wrap gap-4">{avisos.map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={perfil.avisosTraspasos.includes(key)} onChange={e=>setPerfil({...perfil,avisosTraspasos:e.target.checked ? [...perfil.avisosTraspasos,key] : perfil.avisosTraspasos.filter(r=>r!==key)})} />{label}</label>)}</div></fieldset>
      <div className="flex gap-3"><button className="btn-primary" disabled={loading}>{loading ? 'Guardando…' : 'Guardar cuenta'}</button>{uid && <button type="button" className="btn-secondary" onClick={reset}>Cancelar edición</button>}</div>
    </form></section>
    <section className="card overflow-hidden"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold">{usuarios.length} perfiles registrados</h2></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr>{['Usuario','Rol / Área','Avisos','Acciones'].map(c=><th key={c} className="p-4 text-left">{c}</th>)}</tr></thead><tbody>{usuarios.map(u=><tr key={u.id} className="border-t border-slate-200"><td className="p-4"><p className="font-medium">{u.nombre} {u.apellido}</p><p className="text-muted">{u.email}</p>{!u.activo && <span className="text-red-700">Deshabilitado</span>}</td><td className="p-4"><p>{u.rol}</p><p className="text-muted">{u.lugarTrabajo}</p></td><td className="p-4">{avisos.filter(([key])=>u.avisosTraspasos.includes(key)).map(([,label])=>label).join(' · ') || 'Avisos del área'}</td><td className="p-4"><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={loading} onClick={()=>{setUid(u.id);setPerfil({...vacio(),...u});setPassword('');setMensaje('');window.scrollTo({top:0,behavior:'smooth'});}}>Editar</button>{u.activo && <button type="button" className="btn-secondary" disabled={loading} onClick={()=>desactivar(u)}>Desactivar</button>}</div></td></tr>)}</tbody></table></div></section>
  </div>;
}
