import { collection, getDocs, query, where, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Normalize input date to a local Date object (no timezone shift)
 * acepta:
 *  - string "yyyy-mm-dd" (input[type=date])
 *  - string "dd/mm/yyyy"
 *  - Date
 */
function normalizeToLocalDate(fecha) {
  if (!fecha) return new Date();
  if (fecha instanceof Date) {
    // crear una nueva Date que conserva solo y/m/d en zona local
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }
  const s = String(fecha);
  // YYYY-MM-DD -> parsear por partes (evita shift UTC)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  // dd/mm/yyyy
  const localMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (localMatch) {
    const [, d, m, y] = localMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  // fallback
  const parsed = new Date(s);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDateToDDMMYYYY(dateObj) {
  const d = dateObj.getDate().toString().padStart(2, "0");
  const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const y = dateObj.getFullYear().toString();
  return `${d}/${m}/${y}`;
}

/**
 * saveAusenciaJustificacion({ legajo, fecha: Date|string, justificativo, justificar })
 * - busca empleado por legajo (si existe) y completa nombre/apellido/lugarTrabajo
 * - si ya existe ausencia para legajo+fecha la actualiza; si no la crea
 * - devuelve el objeto guardado (incluye id y campos)
 */
export async function saveAusenciaJustificacion({ legajo, fecha = new Date(), justificativo = "", justificar = true } = {}) {
  if (!legajo) throw new Error("Legajo requerido.");

  // normalizar fecha para evitar shifts de timezone
  const fechaDate = normalizeToLocalDate(fecha);
  const fechaStr = formatDateToDDMMYYYY(fechaDate);

  try {
    // buscar empleado por legajo (completar nombre/apellido/lugarTrabajo si existe)
    let empleado = null;
    try {
      const qEmp = query(collection(db, "empleados"), where("legajo", "==", String(legajo)));
      const snapEmp = await getDocs(qEmp);
      if (!snapEmp.empty) {
        const d = snapEmp.docs[0];
        empleado = { id: d.id, ...d.data() };
      }
    } catch (err) {
      console.warn("ausencias.save: no se pudo buscar empleado:", err);
    }

    const payload = {
      legajo: String(legajo),
      fecha: fechaStr,
      justificativo: justificativo || null,
      justificado: !!justificar,
      nombre: empleado?.nombre || null,
      apellido: empleado?.apellido || null,
      // guardar secretaria también para que RRHH/Admin la vean en los reportes
      secretaria: empleado?.secretaria || null,
      lugarTrabajo: empleado?.lugarTrabajo || null,
      updatedAt: serverTimestamp(),
    };

    // upsert ausencia legajo+fecha
    const q = query(
      collection(db, "ausencias"),
      where("legajo", "==", String(legajo)),
      where("fecha", "==", fechaStr)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, payload);
      const result = { id: snap.docs[0].id, ...payload };
      console.log("DEBUG: ausencias.save -> updated", result);
      return result;
    } else {
      const payloadCreate = { ...payload, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, "ausencias"), payloadCreate);
      const result = { id: ref.id, ...payloadCreate };
      console.log("DEBUG: ausencias.save -> created", result);
      return result;
    }
  } catch (err) {
    console.error("ERROR saveAusenciaJustificacion:", err);
    throw err;
  }
}