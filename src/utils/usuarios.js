// src/utils/usuarios.js
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  setDoc,
  doc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";

/**
 * registrarUsuario
 * Registra un nuevo usuario en Firebase Auth y crea su documento en la colección "users"
 */
export async function registrarUsuario(email, password, nombre, apellido, rol, area) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    await setDoc(doc(db, "users", uid), {
      nombre,
      apellido,
      email,
      rol,  // "rrhh", "admin", "empleado"
      area,
      createdAt: serverTimestamp(),
    });

    console.log("✅ Usuario registrado correctamente:", uid);
    return uid;
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);
    throw error;
  }
}

/* ---------------------
   Nuevas utilidades para Admin / Ausencias
   --------------------- */

/**
 * fetchEmpleadosByLugarTrabajo(lugar)
 */
export async function fetchEmpleadosByLugarTrabajo(lugar) {
  if (!lugar) return [];
  const q = query(collection(db, "empleados"), where("lugarTrabajo", "==", lugar));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * fetchAllEmpleados()
 */
export async function fetchAllEmpleados() {
  const q = query(collection(db, "empleados"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * saveAusenciaJustificacion({ legajo, fecha: Date|string, justificativo, justificar })
 * - si ya existe una ausencia para ese legajo y fecha la actualiza; si no, crea una nueva.
 * - guarda nombre, apellido y lugarTrabajo al momento de crear/actualizar.
 */
export async function saveAusenciaJustificacion({ legajo, fecha = new Date(), justificativo = "", justificar = true } = {}) {
  if (!legajo) throw new Error("Legajo requerido.");

  const fechaStr = typeof fecha === "string" ? fecha : fecha.toLocaleDateString("es-AR");

  // Buscar datos del empleado para guardar nombre/apellido/lugarTrabajo junto a la ausencia
  let empleado = null;
  try {
    const qEmp = query(collection(db, "empleados"), where("legajo", "==", String(legajo)));
    const snapEmp = await getDocs(qEmp);
    if (!snapEmp.empty) {
      const d = snapEmp.docs[0];
      empleado = { id: d.id, ...d.data() };
    }
  } catch (err) {
    console.warn("No se pudo obtener empleado para la ausencia:", err);
  }

  // Buscar si ya existe ausencia para ese legajo + fecha
  try {
    const q = query(
      collection(db, "ausencias"),
      where("legajo", "==", String(legajo)),
      where("fecha", "==", fechaStr)
    );
    const snap = await getDocs(q);

    const payload = {
      legajo: String(legajo),
      fecha: fechaStr,
      justificativo: justificativo || null,
      justificado: !!justificar,
      nombre: empleado?.nombre || null,
      apellido: empleado?.apellido || null,
      lugarTrabajo: empleado?.lugarTrabajo || null,
      updatedAt: serverTimestamp(),
    };

    if (!snap.empty) {
      // actualizar el primer documento encontrado
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, payload);
      return { id: snap.docs[0].id, ...payload };
    } else {
      // crear nueva ausencia
      const payloadCreate = { ...payload, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, "ausencias"), payloadCreate);
      return { id: ref.id, ...payloadCreate };
    }
  } catch (err) {
    console.error("saveAusenciaJustificacion error:", err);
    throw err;
  }
}
