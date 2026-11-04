// src/utils/auth.js
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { SEGURIDAD_ACTIVA } from './api';

/**
 * getUserDoc(uid)
 * Devuelve el objeto de la colección "users" para el uid dado, o null
 */
export async function getUserDoc(uid, email = "") {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const perfil = snap.data();
    if (perfil.activo === false) throw new Error('Su cuenta está deshabilitada. Consulte a RRHH.');
    return !SEGURIDAD_ACTIVA && perfil.rol === 'coordinador_traspasos' ? { ...perfil, rol: 'admin' } : perfil;
  }

  // Compatibilidad con perfiles creados desde la pantalla Usuarios,
  // que en instalaciones anteriores pueden tener un ID distinto al UID de Auth.
  if (!SEGURIDAD_ACTIVA && email) {
    const usuarios = await getDocs(query(collection(db, "users"), where("email", "==", email)));
    if (!usuarios.empty) {
      const perfil = usuarios.docs[0].data();
      if (perfil.activo === false) throw new Error('Su cuenta está deshabilitada. Consulte a RRHH.');
      return perfil.rol === 'coordinador_traspasos' ? { ...perfil, rol: 'admin' } : perfil;
    }
  }
  return null;
}
