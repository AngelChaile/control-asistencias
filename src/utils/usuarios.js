// src/utils/usuarios.js
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
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
import { collection, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

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
 * - guarda en colección "ausencias" un registro con justificativo / justificado
 */
export async function saveAusenciaJustificacion({ legajo, fecha = new Date(), justificativo = "", justificar = true } = {}) {
  if (!legajo) throw new Error("Legajo requerido.");

  const fechaStr = typeof fecha === "string" ? fecha : fecha.toLocaleDateString("es-AR");

  // Buscar datos del empleado para guardar nombre/apellido/lugarTrabajo junto a la ausencia
  let empleado = null;
  try {
    const q = query(collection(db, "empleados"), where("legajo", "==", String(legajo)));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      empleado = { id: d.id, ...d.data() };
    }
  } catch (err) {
    console.warn("No se pudo obtener empleado para la ausencia:", err);
  }

  const payload = {
    legajo: String(legajo),
    fecha: fechaStr,
    justificativo: justificativo || null,
    justificado: !!justificar,
    nombre: empleado?.nombre || null,
    apellido: empleado?.apellido || null,
    lugarTrabajo: empleado?.lugarTrabajo || null,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "ausencias"), payload);
  return { id: ref.id, ...payload };
}
