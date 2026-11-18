// El código del organigrama identifica la secretaría aun cuando dos áreas tengan el mismo nombre.
export const ID_SALUD = '1.9.';

export function secretariaDeArea(area) {
  return String(area?.id || '').match(/^\d+\.\d+\./)?.[0] || '';
}

export function administraSalud(perfil) {
  return perfil?.rol === 'admin' && perfil.secretariaAdministradaId === ID_SALUD;
}

export function filtroAdmin(perfil) {
  if (administraSalud(perfil)) return ['secretariaId', '==', ID_SALUD];
  if (!perfil?.lugarTrabajo) throw new Error('Su usuario no tiene área asignada. Consulte a RRHH.');
  return ['lugarTrabajo', '==', perfil.lugarTrabajo];
}

export function empleadoAdministrado(perfil, empleado) {
  const [campo, , valor] = filtroAdmin(perfil);
  return empleado?.[campo] === valor;
}

export function destinoLaboral(area, empleado) {
  const secretariaId = secretariaDeArea(area);
  const destino = { area, areaId: area.id || '', secretariaId, lugarTrabajo: area.nombre };
  if (secretariaId === ID_SALUD) destino.secretaria = 'SALUD';
  else if (empleado.secretariaId === ID_SALUD || secretariaDeArea(empleado.area) === ID_SALUD) destino.secretaria = area.secretaria || '';
  return destino;
}

export function areaAdministrable(perfil, area) {
  return administraSalud(perfil) ? secretariaDeArea(area) === ID_SALUD : area?.nombre === perfil?.lugarTrabajo;
}
