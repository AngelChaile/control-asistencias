import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export async function obtenerUsuarioActual() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (userAuth) => {
      if (!userAuth) return resolve(null);

      const userDoc = await getDoc(doc(db, "users", userAuth.uid));
      if (userDoc.exists()) {
        resolve({ uid: userAuth.uid, ...userDoc.data() });
      } else {
        resolve(null);
      }
    });
  });
}
