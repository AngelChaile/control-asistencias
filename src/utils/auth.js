// src/utils/auth.js
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

/**
 * getUserDoc(uid)
 * Devuelve el objeto de la colección "users" para el uid dado, o null
 */
export async function getUserDoc(uid, email = "") {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  // Compatibilidad con perfiles creados desde la pantalla Usuarios,
  // que en instalaciones anteriores pueden tener un ID distinto al UID de Auth.
  if (email) {
    const usuarios = await getDocs(query(collection(db, "users"), where("email", "==", email)));
    if (!usuarios.empty) return usuarios.docs[0].data();
  }
  return null;
}
