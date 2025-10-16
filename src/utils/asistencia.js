// src/utils/asistencia.js
// funciones: validarToken, buscarEmpleadoPorLegajo, registrarAsistenciaPorLegajo, registrarNuevoEmpleado

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * validarToken(token)
 * busca el token en collection "tokens" y verifica expiresAt (ISO string)
 * No marca token como used (permitimos uso por múltiples empleados mientras no haya expirado).
 * Lanza error si inválido/expirado.
 */
export async function validarToken(token) {
  if (!token) throw new Error("Token requerido.");
  const q = query(collection(db, "tokens"), where("token", "==", token));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("QR inválido o no encontrado.");
  const tokenDoc = snap.docs[0];
  const tokenData = tokenDoc.data();

  const now = new Date();
  const expiresAt = tokenData.expiresAt ? new Date(tokenData.expiresAt) : null;
  if (expiresAt && now > expiresAt) {
    // opcional: marcar used true
    try { await updateDoc(tokenDoc.ref, { used: true }); } catch(e){/* ignore */ }
    throw new Error("⏰ Este QR ya caducó. Solicite uno nuevo.");
  }

  // si tiene flag 'disabled' o 'used' y querés evitar reutilización, lo chequeas aquí.
  if (tokenData.disabled) throw new Error("QR inválido.");
  // OK
  return { id: tokenDoc.id, ...tokenData };
}

/**
 * buscarEmpleadoPorLegajo(legajo)
 * busca en collection "empleados"
 */
export async function buscarEmpleadoPorLegajo(legajo) {
  if (!legajo) return null;
  const q = query(collection(db, "empleados"), where("legajo", "==", String(legajo)));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/**
 * registrarNuevoEmpleado(emp)
 * guarda en collection "empleados"
 */
export async function registrarNuevoEmpleado(emp) {
  if (!emp || !emp.legajo || !emp.nombre || !emp.apellido) {
    throw new Error("Datos incompletos.");
  }
  const ref = await addDoc(collection(db, "empleados"), {
    legajo: String(emp.legajo),
    nombre: emp.nombre,
    apellido: emp.apellido,
    lugarTrabajo: emp.lugarTrabajo || emp.lugar || "",
    secretaria: emp.secretaria || "",
    horario: emp.horario || "",
    rol: "empleado",
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/**
 * registrarAsistenciaPorLegajo(legajo, token)
 * - busca último registro en 'asistencias' filtrando por legajo (sin orderBy en query para evitar índice)
 * - decide tipo por toggling simple: si último.tipo === 'ENTRADA' => 'SALIDA' else 'ENTRADA'
 * - guarda doc con createdAt serverTimestamp y fecha/hora como strings
 */
export async function registrarAsistenciaPorLegajo(legajo, token = null) {
  if (!legajo) throw new Error("Legajo requerido.");

    // ✅ Validar token antes de continuar
  if (token) {
    await validarToken(token); // Si el token está vencido, lanzará error automáticamente
  }

  const empleado = await buscarEmpleadoPorLegajo(legajo);
  if (!empleado) throw new Error("Empleado no encontrado.");

  // obtener todas asistencias para el legajo y elegir la última por createdAt (client-side)
  const q = query(collection(db, "asistencias"), where("legajo", "==", String(legajo)));
  const snap = await getDocs(q);
  let last = null;
  if (!snap.empty) {
    // map docs to with createdAt numeric timestamp if available
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // sort by createdAt (try to handle different formats)
    docs.sort((a, b) => {
      const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bTime - aTime;
    });
    last = docs[0];
  }

  const now = new Date();
  const fechaStr = now.toLocaleDateString("es-AR");
  const horaStr = now.toLocaleTimeString("es-AR");

  let tipo = "ENTRADA";
  if (last && last.tipo === "ENTRADA") {
    tipo = "SALIDA";
  } else {
    tipo = "ENTRADA";
  }

  // guardar
  const newDoc = await addDoc(collection(db, "asistencias"), {
    legajo: String(legajo),
    nombre: empleado.nombre,
    apellido: empleado.apellido,
    secretaria: empleado.secretaria || "",
    lugarTrabajo: empleado.lugarTrabajo || "",
    tipo,
    fecha: fechaStr,
    hora: horaStr,
    token: token || null,
    createdAt: serverTimestamp()
  });

  return {
    empleado,
    tipo,
    fecha: fechaStr,
    hora: horaStr,
    id: newDoc.id
  };
}
