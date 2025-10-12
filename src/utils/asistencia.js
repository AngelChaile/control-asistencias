// src/utils/asistencia.js
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

/**
 * Valida que el token exista y no haya expirado
 */
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

/**
 * Registra asistencia validando que el empleado exista.
 * Si no existe, retorna un mensaje indicando que debe registrarse.
 */
export async function registrarAsistencia({ legajo, tipo }) {
  try {
    // 1️⃣ Buscar el usuario por su legajo en la colección "users"
    const q = query(collection(db, "users"), where("legajo", "==", legajo));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // No existe el empleado
      return { success: false, message: "Empleado no encontrado" };
    }

    // 2️⃣ Tomar los datos del primer usuario encontrado
    const userData = querySnapshot.docs[0].data();

    const nombre = userData.nombre || "";
    const apellido = userData.apellido || "";
    const area = userData.area || "";

    // Validación extra: evitar registrar si algo viene undefined
    if (!nombre || !apellido || !area) {
      return { success: false, message: "Datos del empleado incompletos" };
    }

    // 3️⃣ Registrar la asistencia en la colección "asistencias"
    await addDoc(collection(db, "asistencias"), {
      legajo,
      nombre,
      apellido,
      area,
      tipo, // entrada o salida
      fecha: serverTimestamp(),
    });

    return { success: true, message: "Asistencia registrada correctamente" };
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    return { success: false, message: "Error al registrar la asistencia" };
  }
}
