import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

// Devuelve el usuario actual con su rol
export async function obtenerUsuarioActual() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return resolve(null);
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return resolve(null);
        resolve({ uid: user.uid, email: user.email, ...snap.data() });
      } catch (err) {
        reject(err);
      }
    });
  });
}
