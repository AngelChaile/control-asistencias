// src/utils/usuarios.js
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";

export async function registrarUsuario(email, password, nombre, apellido, rol, area) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;

  await setDoc(doc(db, "users", uid), {
    nombre,
    apellido,
    email,
    rol,  // "rrhh", "admin", "empleado"
    area,
    createdAt: serverTimestamp()
  });

  console.log("✅ Usuario registrado correctamente:", uid);
}
