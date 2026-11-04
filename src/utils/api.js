import { auth } from '../firebase';

export const SEGURIDAD_ACTIVA = import.meta.env.VITE_SEGURIDAD_ACTIVA === 'true';

export async function llamarApi(ruta, datos, autenticada = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (autenticada) {
    if (!auth?.currentUser) throw new Error('Inicie sesión para continuar.');
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  let response;
  try { response = await fetch(`/api/${ruta}`, { method: 'POST', headers, body: JSON.stringify(datos) }); }
  catch { throw new Error('No se pudo conectar con el servicio. Revise su conexión e intente nuevamente.'); }
  const resultado = await response.json().catch(() => ({ error: 'El servicio todavía no está disponible. Comuníquese con RRHH.' }));
  if (!response.ok || resultado.error) throw new Error(resultado.error || 'No se pudo completar la operación.');
  return resultado;
}
