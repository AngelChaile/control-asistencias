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
 * Buscar empleado por legajo
 */
export async function buscarEmpleadoPorLegajo(legajo) {
  const q = query(collection(db, "users"), where("legajo", "==", legajo));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const empleado = querySnapshot.docs[0].data();
  return { id: querySnapshot.docs[0].id, ...empleado };
}

/**
 * Registrar asistencia del empleado
 */
export async function registrarAsistencia(empleado) {
  try {
    const {
      legajo,
      nombre,
      apellido,
      email,
      horario,
      lugarTrabajo,
      secretaria,
      rol,
    } = empleado;

    if (!legajo || !nombre || !apellido) {
      throw new Error("Datos incompletos del empleado.");
    }

    await addDoc(collection(db, "asistencias"), {
      legajo,
      nombre,
      apellido,
      email: email || "",
      horario: horario || "",
      lugarTrabajo: lugarTrabajo || "",
      secretaria: secretaria || "",
      rol: rol || "",
      fecha: serverTimestamp(),
    });

    return { success: true, message: "Asistencia registrada correctamente" };
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    return { success: false, message: "Error al registrar la asistencia" };
  }
}

/**
 * Registrar nuevo empleado
 */
export async function registrarNuevoEmpleado(nuevoEmpleado) {
  try {
    const docRef = doc(collection(db, "users"));
    await setDoc(docRef, {
      ...nuevoEmpleado,
      rol: "empleado",
    });
    return { success: true, message: "Empleado registrado correctamente" };
  } catch (error) {
    console.error("❌ Error en registrarNuevoEmpleado:", error);
    return { success: false, message: "Error al registrar el empleado" };
  }
}
