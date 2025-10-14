// src/utils/asistencia.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  limit
} from "firebase/firestore";
import { db } from "./../firebase";

// ✅ Validar token: comprueba si existe, expiró o fue usado
export async function validarToken(token) {
  const q = query(collection(db, "tokens"), where("token", "==", token));
  const snap = await getDocs(q);

  if (snap.empty) throw new Error("QR inválido o no encontrado.");

  const tokenDoc = snap.docs[0];
  const tokenData = tokenDoc.data();
  const now = new Date();
  const expiresAt = new Date(tokenData.expiresAt);

  // ✅ Si ya expiró
  if (now > expiresAt) {
    await updateDoc(tokenDoc.ref, { used: true });
    throw new Error("⏰ Este QR ya caducó. Solicite uno nuevo.");
  }

  // ✅ Si ya fue usado
  if (tokenData.used) {
    throw new Error("⚠️ Este QR ya fue utilizado.");
  }

  // Devuelve referencia también para marcarlo más adelante si querés
  return { ref: tokenDoc.ref, ...tokenData };
}

// ✅ Buscar empleado en colección 'empleados'
export async function buscarEmpleadoPorLegajo(legajo) {
  if (!legajo) return null;
  const q = query(collection(db, "empleados"), where("legajo", "==", String(legajo)));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

// ✅ Registrar un nuevo empleado
export async function registrarNuevoEmpleado(emp) {
  if (!emp || !emp.legajo || !emp.nombre || !emp.apellido) {
    throw new Error("Datos incompletos para registrar empleado.");
  }

  const ref = await addDoc(collection(db, "empleados"), {
    legajo: String(emp.legajo),
    nombre: emp.nombre,
    apellido: emp.apellido,
    lugarTrabajo: emp.lugarTrabajo || emp.area || "",
    secretaria: emp.secretaria || "",
    horario: emp.horario || "",
    rol: emp.rol || "empleado",
    email: emp.email || "",
    createdAt: serverTimestamp()
  });
  return ref.id;
}

// ✅ Registrar asistencia
export async function registrarAsistenciaPorLegajo(legajo, tokenData = null) {
  if (!legajo) throw new Error("Legajo requerido.");

  // 1️⃣ Buscar empleado
  const empleado = await buscarEmpleadoPorLegajo(legajo);
  if (!empleado) throw new Error("Empleado no encontrado.");

  // 2️⃣ Última asistencia
  const qLast = query(
    collection(db, "asistencias"),
    where("legajo", "==", String(legajo)),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snapLast = await getDocs(qLast);

  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString("es-AR");
  const horaStr = ahora.toLocaleTimeString("es-AR");

  let tipo = "ENTRADA";
  if (!snapLast.empty) {
    const last = snapLast.docs[0].data();
    const lastTipo = last.tipo;
    let lastDate = null;

    if (last.createdAt?.seconds) {
      lastDate = new Date(last.createdAt.seconds * 1000);
    } else if (typeof last.createdAt === "string") {
      lastDate = new Date(last.createdAt);
    } else if (last.createdAt instanceof Date) {
      lastDate = last.createdAt;
    }

    if (lastTipo === "ENTRADA" && lastDate) {
      const diffMin = (ahora - lastDate) / 60000;
      if (diffMin <= 1) {
        throw new Error(`Ey ${empleado.apellido}, ya registraste tu entrada hace menos de 1 minuto.`);
      }
      tipo = "SALIDA";
    } else if (lastTipo === "SALIDA") {
      tipo = "ENTRADA";
    }
  }

  // 3️⃣ Guardar asistencia
  const docRef = await addDoc(collection(db, "asistencias"), {
    legajo: String(legajo),
    nombre: empleado.nombre,
    apellido: empleado.apellido,
    secretaria: empleado.secretaria || "",
    lugarTrabajo: empleado.lugarTrabajo || "",
    tipo,
    fecha: fechaStr,
    hora: horaStr,
    token: tokenData?.token || null,
    createdAt: serverTimestamp()
  });

  // 4️⃣ Si querés invalidar el token en el primer uso:
  if (tokenData?.ref) {
    await updateDoc(tokenData.ref, { used: true });
  }

  return {
    ok: true,
    docId: docRef.id,
    tipo,
    fecha: fechaStr,
    hora: horaStr,
    empleado
  };
}
