import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { destinatariosTraspaso, AVISOS_ANTERIORES } from './destinatariosTraspasos.mjs';
import { SEGURIDAD_ACTIVA } from './api';

export async function getNotificaciones(usuarioId) {
  const snapshot = await getDocs(query(collection(db,'notificaciones'),where('usuarioId','==',usuarioId),orderBy('createdAt','desc')));
  return snapshot.docs.map(d=>({id:d.id,...d.data()}));
}
export async function marcarComoLeida(id) { await updateDoc(doc(db,'notificaciones',id),{leido:true}); }

export async function notificarTraspasoFinalizado(datos) {
  const snapshot = await getDocs(collection(db,'users'));
  const usuarios = snapshot.docs.map(d=>{
    const perfil=d.data();
    return {...perfil,uid:d.id, avisosTraspasos:perfil.avisosTraspasos || (!SEGURIDAD_ACTIVA ? AVISOS_ANTERIORES[perfil.email?.toLowerCase()] : []) || []};
  });
  const destinatarios = destinatariosTraspaso(usuarios,datos);
  const fallos = [];
  for (const aviso of destinatarios) {
    try {
      const { usuarioId,titulo,mensaje,tipo,link } = aviso;
      await addDoc(collection(db,'notificaciones'),{usuarioId,titulo,mensaje,tipo,link,leido:false,createdAt:serverTimestamp()});
      await addDoc(collection(db,'notificaciones_email'),{destinatarioEmail:aviso.email,asunto:titulo,mensaje,tipo:datos.tipo || 'traspaso',estado:'pendiente',createdAt:serverTimestamp()});
    } catch (error) { fallos.push(aviso.email); console.error('No se pudo guardar un aviso de traspaso:',error.code); }
  }
  return {destinatarios,fallos};
}
