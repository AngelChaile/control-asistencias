// src/utils/asistencia.js
import { db } from "../firebase";
import { collection, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Valida que el token exista y no haya expirado
export async function validarToken(token) {
  const tokenRef = doc(db, "tokens", token);
  const tokenSnap = await getDoc(tokenRef);

  if (!tokenSnap.exists()) return false;

  const data = tokenSnap.data();
  const now = new Date();
  const expiresAt = new Date(data.expiresAt);

  if (data.used || now > expiresAt) return false;

  return true;
}

// Registra la asistencia del empleado
export async function registrarAsistencia({ legajo, nombre, apellido, area, tipo }) {
  const docRef = doc(collection(db, "asistencias"));
  await setDoc(docRef, {
    legajo,
    nombre,
    apellido,
    area,
    tipo, // "entrada" o "salida"
    fecha: serverTimestamp()
  });
}
