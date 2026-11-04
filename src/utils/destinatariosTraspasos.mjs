export const MENSAJES_RESPONSABILIDAD = {
  actualizar_sistemas: 'Debe actualizar el traspaso del personal en Major y Portal Empleados.',
  notificar_empleado: 'Debe notificar al empleado su baja del área anterior y su nuevo destino.',
};
// Semilla de migración: conserva los destinatarios que estaban en producción.
export const AVISOS_ANTERIORES = {
  'registrosdeasistenciasmoron@gmail.com': ['actualizar_sistemas'],
  'safeguarding740@gmail.com': ['notificar_empleado'],
};

export function destinatariosTraspaso(usuarios, { empleado, areaOrigen, areaDestino }) {
  const texto = `${empleado?.nombre || 'El empleado'} (legajo ${empleado?.legajo || 'sin dato'}) fue traspasado de ${areaOrigen} a ${areaDestino}.`;
  const destinatarios = new Map();
  for (const usuario of usuarios) {
    if (usuario.activo === false || !usuario.email || !usuario.uid) continue;
    const tareas = (usuario.avisosTraspasos || []).map(r => MENSAJES_RESPONSABILIDAD[r]).filter(Boolean);
    const areaAfectada = usuario.rol === 'admin' && [areaOrigen, areaDestino].includes(usuario.lugarTrabajo);
    if (!tareas.length && !areaAfectada) continue;
    const mensajes = [...tareas];
    if (areaAfectada) mensajes.push(usuario.lugarTrabajo === areaDestino ? `El agente fue asignado a su área (${areaDestino}).` : `El agente ya no pertenece a su área (${areaOrigen}).`);
    destinatarios.set(usuario.email.toLowerCase(), { usuarioId:usuario.uid, email:usuario.email,
      titulo:'Traspaso finalizado', mensaje:`${texto} ${mensajes.join(' ')}`, tipo:tareas.length ? 'traspaso_coordinacion' : 'traspaso_area',
      link:['rrhh','subsecretario'].includes(usuario.rol) ? '/rrhh/gestion-solicitudes' : '/admin' });
  }
  return [...destinatarios.values()];
}
