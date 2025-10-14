// src/utils/asistencia.js
// Funciones: validarToken, buscarEmpleadoPorLegajo, registrarAsistenciaPorLegajo, registrarNuevoEmpleado

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
} from "firebase/firestore"; // 👈 Importa directamente desde firebase/firestore

import { limit } from "firebase/firestore";
import { db } from "./../firebase"; // Ajustar ruta según estructura de carpetas


/** ESTO LO COMENTE PARA NO BORRAR Y PROBAR LA FUNCION DE ABAJO. PERO SI FUNCIONA, BORRAR ESTO
 * Validar token: busca en collection 'tokens' por campo token,
 * verifica expiresAt (ISO string) y used flag.
 */
/* export async function validarToken(token) {
  if (!token) throw new Error("Token inválido.");

  const q = query(collection(db, "tokens"), where("token", "==", token), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Token no encontrado o inválido.");

  const tokenDoc = snap.docs[0];
  const data = tokenDoc.data();

  // expiresAt se guardó como ISO string
  if (data.expiresAt) {
    const expires = new Date(data.expiresAt);
    if (Date.now() > expires.getTime()) {
      throw new Error("Token expirado.");
    }
  }

  if (data.used) throw new Error("Token ya fue usado.");

  // devolvemos info útil (id doc y area registrada)
  return { id: tokenDoc.id, token: data.token, area: data.area || null, docRefId: tokenDoc.id };
} */

  /* export async function validarToken(token) {
  const q = query(collection(db, "tokens"), where("token", "==", token));
  const snap = await getDocs(q);

  if (snap.empty) throw new Error("QR inválido o no encontrado.");

  const tokenData = snap.docs[0].data();
  const now = new Date();
  const expiresAt = new Date(tokenData.expiresAt);

  // 🔥 Validar expiración
  if (now > expiresAt) {
    throw new Error("Este QR ya caducó. Por favor solicite uno nuevo.");
  }

  // Si querés también podés invalidarlo automáticamente
  // await updateDoc(snap.docs[0].ref, { used: true });

  return tokenData;
} */

  export async function validarToken(token) {
  const q = query(collection(db, "tokens"), where("token", "==", token));
  const snap = await getDocs(q);

  if (snap.empty) throw new Error("QR inválido o no encontrado.");

  const tokenDoc = snap.docs[0];
  const tokenData = tokenDoc.data();
  const now = new Date();
  const expiresAt = new Date(tokenData.expiresAt);

  // ✅ Verificar si ya expiró
  if (now > expiresAt) {
    // Invalida el QR para que ya no se pueda volver a usar
    await updateDoc(tokenDoc.ref, { used: true });
    throw new Error("⏰ Este QR ya caducó. Solicite uno nuevo.");
  }

  // ✅ Verificar si ya fue usado previamente
  if (tokenData.used) {
    throw new Error("⚠️ Este QR ya fue utilizado.");
  }

  return tokenData;
}


/**
 * Buscar empleado por legajo en collection 'users'
 * Retorna objeto { id, ...data } o null si no existe.
 */
export async function buscarEmpleadoPorLegajo(legajo) {
  if (!legajo) return null;
  const q = query(collection(db, "users"), where("legajo", "==", String(legajo)));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Registrar un nuevo empleado (en collection 'users')
 * Espera un objeto con: legajo, nombre, apellido, lugarTrabajo, secretaria, horario, rol (opc)
 * Retorna el doc id.
 */
export async function registrarNuevoEmpleado(emp) {
  if (!emp || !emp.legajo || !emp.nombre || !emp.apellido) {
    throw new Error("Datos incompletos para registrar empleado.");
  }
  // guardamos con setDoc en doc auto (addDoc) para simplicidad
  const ref = await addDoc(collection(db, "users"), {
    legajo: String(emp.legajo),
    nombre: emp.nombre,
    apellido: emp.apellido,
    lugarTrabajo: emp.lugarTrabajo || emp.area || "",
    secretaria: emp.secretaria || "",
    horario: emp.horario || "",
    rol: emp.rol || "empleado",
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/**
 * Registrar asistencia por legajo:
 * - Busca el empleado en 'users'
 * - Busca la última asistencia del legajo (collection 'asistencias' ordenada por createdAt desc, limit 1)
 * - Aplica regla: si no hay última => ENTRADA
 *                si última.tipo === 'ENTRADA' y pasó > 10 min => SALIDA
 *                si última.tipo === 'ENTRADA' y pasó <= 10 min => error (ya fichó hace poco)
 *                si última.tipo === 'SALIDA' => ENTRADA
 * - Guarda el documento en 'asistencias' con createdAt serverTimestamp
 * - (Opcional) marca token como used => aquí no lo marcamos automáticamente porque querés reutilizar tokens por 30 min;
 *   si querés invalidarlo al primer uso, podemos hacerlo.
 *
 * Devuelve: { ok:true, docId, tipo, fechaStr, horaStr, empleado }
 */
export async function registrarAsistenciaPorLegajo(legajo, token = null) {
  if (!legajo) throw new Error("Legajo requerido.");

  // 1) buscar empleado
  const empleado = await buscarEmpleadoPorLegajo(legajo);
  if (!empleado) throw new Error("Empleado no encontrado.");

  // 2) obtener última asistencia
  const qLast = query(
    collection(db, "asistencias"),
    where("legajo", "==", String(legajo)),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snapLast = await getDocs(qLast);

  // parse fecha/hora ahora (strings)
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString("es-AR");
  const horaStr = ahora.toLocaleTimeString("es-AR");

  let tipo = "ENTRADA";
  if (!snapLast.empty) {
    const last = snapLast.docs[0].data();
    const lastTipo = last.tipo;
    // last.createdAt puede ser timestamp Firestore o string, manejamos ambos
    let lastDate = null;
    if (last.createdAt && last.createdAt.seconds) {
      lastDate = new Date(last.createdAt.seconds * 1000);
    } else if (last.createdAt && typeof last.createdAt === "string") {
      lastDate = new Date(last.createdAt);
    } else if (last.createdAt instanceof Date) {
      lastDate = last.createdAt;
    }

    if (lastTipo === "ENTRADA" && lastDate) {
      const diffMin = (ahora - lastDate) / 60000;
      if (diffMin <= 1) {
        throw new Error(`Ey ${empleado.apellido}, ya registraste tu entrada hace menos de 1 minuto.`);
      }
      // si pasó > 10 min, se considera SALIDA
      tipo = "SALIDA";
    } else if (lastTipo === "ENTRADA" && !lastDate) {
      // fallback
      tipo = "SALIDA";
    } else if (lastTipo === "SALIDA") {
      // último fue salida -> ahora entrada
      tipo = "ENTRADA";
    } else {
      // si no hay info, default ENTRADA
      tipo = "ENTRADA";
    }
  } else {
    tipo = "ENTRADA";
  }

  // 3) guardar asistencia
  const docRef = await addDoc(collection(db, "asistencias"), {
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


  //  marcar token como usado PERO ESTO HAY Q REVISAR SI CONVIENE DEJARLO PORQUE SI NO HAY Q ESCANEAR UN QR POR EMPLEADO Y NO ES PRACTICO
  await updateDoc(tokenDoc.ref, { used: true });


  return {
    ok: true,
    docId: docRef.id,
    tipo,
    fecha: fechaStr,
    hora: horaStr,
    empleado
  };
}
