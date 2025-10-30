// src/utils/asistencia.js
// funciones: validarToken, buscarEmpleadoPorLegajo, registrarAsistenciaPorLegajo, registrarNuevoEmpleado

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * validarToken(token)
 * Busca el token en collection "tokens" y verifica expiresAt (ISO string)
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
    try {
      await updateDoc(tokenDoc.ref, { used: true });
    } catch (e) {
      console.warn("No se pudo marcar el token como usado:", e);
    }
    throw new Error("⏰ Este QR ya caducó. Solicite uno nuevo.");
  }

  if (tokenData.disabled) throw new Error("QR inválido.");

  return { id: tokenDoc.id, ...tokenData };
}

/**
 * buscarEmpleadoPorLegajo(legajo)
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
 */
export async function registrarNuevoEmpleado(emp) {
  if (!emp || !emp.legajo || !emp.nombre || !emp.apellido) {
    throw new Error("Datos incompletos para registrar empleado.");
  }

  const ref = await addDoc(collection(db, "empleados"), {
    legajo: String(emp.legajo),
    nombre: emp.nombre,
    apellido: emp.apellido,
    lugarTrabajo: emp.lugarTrabajo || emp.lugar || "",
    secretaria: emp.secretaria || "",
    horario: emp.horario || "",
    rol: "empleado",
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

/**
 * registrarAsistenciaPorLegajo(legajo, token)
 * alterna tipo: ENTRADA ↔ SALIDA
 */
export async function registrarAsistenciaPorLegajo(legajo, token = null) {
  if (!legajo) throw new Error("Legajo requerido.");

  // Validar token antes de continuar
  if (token) {
    await validarToken(token);
  }

  const empleado = await buscarEmpleadoPorLegajo(legajo);
  if (!empleado) throw new Error("Empleado no encontrado.");

  // Obtener todas las asistencias del legajo
  const q = query(collection(db, "asistencias"), where("legajo", "==", String(legajo)));
  const snap = await getDocs(q);

  let last = null;
  if (!snap.empty) {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const aTime = a.createdAt?.seconds
        ? a.createdAt.seconds * 1000
        : a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;
      const bTime = b.createdAt?.seconds
        ? b.createdAt.seconds * 1000
        : b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;
      return bTime - aTime;
    });
    last = docs[0];
  }

  const now = new Date();
  const fechaStr = now.toLocaleDateString("es-AR");
  const horaStr = now.toLocaleTimeString("es-AR");

  // Determinar si la última fichada es del mismo día que 'now'
  function parseCreatedAtToDate(r) {
    if (!r) return null;
    if (r.createdAt?.seconds) return new Date(r.createdAt.seconds * 1000);
    if (r.fecha && typeof r.fecha === "string") {
      const parts = r.fecha.split("/");
      if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        return new Date(y, m - 1, d);
      }
    }
    return null;
  }

  const lastDate = parseCreatedAtToDate(last);
  const isSameDay = lastDate
    ? lastDate.getFullYear() === now.getFullYear() &&
      lastDate.getMonth() === now.getMonth() &&
      lastDate.getDate() === now.getDate()
    : false;

  // Si la última fichada fue el mismo día: alternar ENTRADA/SALIDA según last.tipo
  // Si la última fichada fue otro día o no existe: siempre marcar ENTRADA
  let tipo;
  if (isSameDay) {
    tipo = last && last.tipo === "ENTRADA" ? "SALIDA" : "ENTRADA";
  } else {
    tipo = "ENTRADA";
  }

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
    createdAt: serverTimestamp(),
  });

  return {
    empleado,
    tipo,
    fecha: fechaStr,
    hora: horaStr,
    id: newDoc.id,
  };
}

/* ---------------------
   Nuevas utilidades para Reportes / Admin / RRHH
   --------------------- */

/**
 * fetchAsistenciasByDate(date, area)
 * date: Date object (default = today)
 * area: string o null -> filtra por lugarTrabajo
 */
export async function fetchAsistenciasByDate(date = new Date(), area = null) {
  const fechaStr = date.toLocaleDateString("es-AR");
  const constraints = [where("fecha", "==", fechaStr)];
  if (area) constraints.push(where("lugarTrabajo", "==", area));
  const q = query(collection(db, "asistencias"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * fetchAsistenciasToday(area)
 */
export async function fetchAsistenciasToday(area = null) {
  return fetchAsistenciasByDate(new Date(), area);
}

/**
 * fetchAsistenciasByRange({ desde: Date|null, hasta: Date|null, legajo: string|null, nombre: string|null, area: string|null })
 * - realiza la consulta básica y filtra en cliente por fecha, legajo, nombre/apellido y área
 * - MEJORADO: búsqueda case-insensitive para todos los campos y que ignore espacios
 */
export async function fetchAsistenciasByRange({ desde = null, hasta = null, legajo = "", nombre = "", area = null } = {}) {
  // QUITAMOS el filtro de área del servidor para hacerlo case-insensitive en el cliente
  const constraints = [];
  // if (area) constraints.push(where("lugarTrabajo", "==", area)); // ← ELIMINADO
  const q = query(collection(db, "asistencias"), ...constraints);
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  function toTime(r) {
    if (r.createdAt?.seconds) return r.createdAt.seconds * 1000;
    // intentar parsear fecha (dd/mm/yyyy) -> crear Date con partes
    if (r.fecha && typeof r.fecha === "string") {
      const parts = r.fecha.split("/");
      if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        return new Date(y, m - 1, d).getTime();
      }
    }
    return 0;
  }

  const desdeTs = desde ? desde.getTime() : null;
  const hastaTs = hasta ? hasta.getTime() : null;

  // Normalizar filtros (trim + lowercase)
  const legajoNormalized = legajo ? legajo.trim().toLowerCase() : "";
  const nombreNormalized = nombre ? nombre.trim().toLowerCase() : "";
  const areaNormalized = area ? area.trim().toLowerCase() : "";

  const filtered = rows.filter((r) => {
    const t = toTime(r);
    if (desdeTs && t < desdeTs) return false;
    if (hastaTs && t > hastaTs + 24 * 3600 * 1000 - 1) return false; // incluir hasta día completo
    
    // Filtro por legajo (case-insensitive y sin espacios)
    if (legajoNormalized) {
      const legajoRecord = String(r.legajo || "").toLowerCase();
      if (!legajoRecord.includes(legajoNormalized)) return false;
    }
    
    // Filtro por nombre/apellido (case-insensitive y sin espacios)
    if (nombreNormalized) {
      const fullName = `${r.nombre || ""} ${r.apellido || ""}`.toLowerCase().trim();
      if (!fullName.includes(nombreNormalized)) return false;
    }
    
    // Filtro por área (case-insensitive y sin espacios) - AHORA EN CLIENTE
    if (areaNormalized) {
      const areaRecord = String(r.lugarTrabajo || "").toLowerCase();
      if (!areaRecord.includes(areaNormalized)) return false;
    }
    
    return true;
  });

  // ordenar por fecha/hora (descendente)
  filtered.sort((a, b) => toTime(b) - toTime(a));
  return filtered;
}

/**
 * fetchAusenciasByRange({ desde, hasta, area })
 * - Busca en colección "ausencias" si existe, si no devuelve vacío.
 */
export async function fetchAusenciasByRange({ desde = null, hasta = null, area = null } = {}) {
  const constraints = [];
  if (area) constraints.push(where("lugarTrabajo", "==", area));
  const q = query(collection(db, "ausencias"), ...constraints);

  try {
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // si no hay rango, devolver todo
    if (!desde && !hasta) return rows;

    // normalizar fechas (inicio de día / fin de día)
    const desdeTs = desde ? new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()).getTime() : null;
    const hastaTs = hasta
      ? new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate()).getTime() + 24 * 3600 * 1000 - 1
      : null;

    return rows.filter((r) => {
      let t = null;

      // preferir fecha (dd/mm/yyyy) cuando exista
      if (r.fecha && typeof r.fecha === "string") {
        const parts = r.fecha.split("/");
        if (parts.length === 3) {
          const [d, m, y] = parts.map(Number);
          t = new Date(y, m - 1, d).getTime();
        }
      }

      // si no hay 'fecha' fiable, usar createdAt si está
      if (t === null && r.createdAt?.seconds) {
        t = r.createdAt.seconds * 1000;
      }

      // si no podemos obtener tiempo, excluir
      if (t === null) return false;
      if (desdeTs && t < desdeTs) return false;
      if (hastaTs && t > hastaTs) return false;
      return true;
    });
  } catch (err) {
    console.warn("fetchAusenciasByRange:", err);
    return [];
  }
}

// Compatibilidad: alias para nombres usados en otras partes del proyecto
/**
 * fetchAsistenciasByFilters(filters)
 * Wrapper para fetchAsistenciasByRange con el mismo shape de parámetros
 */
export async function fetchAsistenciasByFilters(filters = {}) {
  return fetchAsistenciasByRange(filters);
}

/**
 * fetchAusenciasByArea(area)
 * Wrapper para obtener ausencias filtradas por área
 */
export async function fetchAusenciasByArea(area) {
  return fetchAusenciasByRange({ area });
}

/**
 * fetchAsistenciasPage({ desde, hasta, area, pageSize = 200, cursorDoc = null })
 * - trae asistencias paginadas; filtrar por area en servidor si existe
 */
export async function fetchAsistenciasPage({ desde = null, hasta = null, area = null, pageSize = 200, cursorDoc = null } = {}) {
  const constraints = [];
  if (area) constraints.push(where("lugarTrabajo", "==", area));
  // ordenar por createdAt (si está) o por fecha/hora; ajustar según esquema
  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(pageSize));

  const qArgs = [collection(db, "asistencias"), ...constraints];
  const q = cursorDoc ? query(...qArgs, startAfter(cursorDoc)) : query(...qArgs);

  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  return { rows, lastDoc };
}

/**
 * fetchAsistenciasTodayPage({ area, pageSize = 50, cursorDoc = null })
 * - Trae asistencias paginadas SOLO del día actual
 */
export async function fetchAsistenciasTodayPage({ area = null, pageSize = 50, cursorDoc = null } = {}) {
  const fechaStr = new Date().toLocaleDateString("es-AR");
  
  const constraints = [
    where("fecha", "==", fechaStr)
  ];
  
  if (area) constraints.push(where("lugarTrabajo", "==", area));
  
  // Ordenar por hora descendente para ver los más recientes primero
  constraints.push(orderBy("hora", "desc"));
  constraints.push(limit(pageSize));

  const qArgs = [collection(db, "asistencias"), ...constraints];
  const q = cursorDoc ? query(...qArgs, startAfter(cursorDoc)) : query(...qArgs);

  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  
  return { rows, lastDoc };
}
