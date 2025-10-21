import { collection, getDocs, query, where, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * saveAusenciaJustificacion({ legajo, fecha: Date|string, justificativo, justificar })
 * - busca empleado por legajo (si existe) y completa nombre/apellido/lugarTrabajo
 * - si ya existe ausencia para legajo+fecha la actualiza; si no la crea
 * - devuelve el objeto guardado (incluye id, fecha en dd/mm/yyyy, justificativo, nombre/apellido/lugarTrabajo)
 */
export async function saveAusenciaJustificacion({ legajo, fecha = new Date(), justificativo = "", justificar = true } = {}) {
  if (!legajo) throw new Error("Legajo requerido.");

  const fechaStr = typeof fecha === "string" ? fecha : fecha.toLocaleDateString("es-AR");

  try {
    // buscar empleado por legajo
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

    // preparar payload
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