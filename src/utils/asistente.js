import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { auth, db } from "../firebase";
import { getUserDoc } from "./auth";
import { alcanceAsistente, filtrarPersonal, rankingAusencias } from "./asistenteConsultas.mjs";

const MAX_REGISTROS = 5000;

export async function consultarDatosAsistente(tipo, filtros) {
  // El alcance se vuelve a leer del perfil de Firebase; no se toma de la pregunta.
  if (!auth?.currentUser || !db) throw new Error("Iniciá sesión para consultar los datos.");
  const sesion = auth.currentUser;
  const perfil = await getUserDoc(sesion.uid, sesion.email);
  if (auth.currentUser?.uid !== sesion.uid) throw new Error("La sesión cambió. Volvé a realizar la consulta.");
  const alcance = alcanceAsistente(perfil);
  if (!alcance.personal) throw new Error("Tu perfil no tiene acceso a consultas de personal.");
  if (!["personal", "ausencias"].includes(tipo)) throw new Error("Seleccioná una consulta disponible.");
  const area = alcance.area || filtros.area || "";
  if (alcance.area && filtros.area && filtros.area !== alcance.area) {
    throw new Error("Sólo podés consultar datos de tu área asignada.");
  }
  if (tipo === "ausencias" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(filtros.mes || "")) {
    throw new Error("Seleccioná el mes de las ausencias.");
  }
  const constraints = area ? [where("lugarTrabajo", "==", area)] : [];
  const snap = await getDocs(query(
    collection(db, tipo === "personal" ? "empleados" : "ausencias"),
    ...constraints, limit(MAX_REGISTROS + 1)
  ));
  if (snap.size > MAX_REGISTROS) {
    throw new Error("La consulta supera los 5.000 registros. Seleccioná un área más específica; no se muestran totales incompletos.");
  }
  const registros = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  const filtrosEfectivos = { ...filtros, area };
  if (tipo === "ausencias") {
    return { tipo, ...rankingAusencias(registros, filtrosEfectivos), area, mes: filtros.mes, consultadoEn: new Date() };
  }
  return {
    tipo, filas: filtrarPersonal(registros, filtrosEfectivos), area,
    sinLocalidad: registros.filter(emp => !String(emp.localidad || "").trim()).length,
    consultadoEn: new Date(),
  };
}
