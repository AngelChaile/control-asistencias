// helpers para auth & users collection
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * getUserDoc(uid)
 * devuelve el objeto de la colección "users" para el uid dado, o null
 */
export async function getUserDoc(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}
