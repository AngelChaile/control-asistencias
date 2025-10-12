// src/utils/asistencia.js
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  serverTimestamp
} from "../firebase";

// 🔹 Verifica si el token del QR es válido (por ahora no cambia)
export async function validarToken(token) {
  const tokenRef = doc(db, "tokens", token);
  const tokenSnap = await getDoc(tokenRef);

  if (!tokenSnap.exists()) return false;

  const data = tokenSnap.data();
  const now = new Date();
  const expiresAt = new Date(data.expiresAt);

  if (data.used || now > expiresAt) return false;

  return true;
}

// 🔹 Busca un empleado por legajo
export async function buscarEmpleadoPorLegajo(legajo) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("legajo", "==", legajo));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const empleado = snapshot.docs[0].data();
  empleado.id = snapshot.docs[0].id;
  return empleado;
}

// 🔹 Registra una asistencia en la colección 'asistencias'
export async function registrarAsistencia(empleado) {
  const { legajo, nombre, apellido, area } = empleado;
  const fecha = new Date();

  await addDoc(collection(db, "asistencias"), {
    legajo,
    nombre,
    apellido,
    area,
    tipo: "entrada",
    fecha: fecha.toLocaleDateString(),
    hora: fecha.toLocaleTimeString(),
    timestamp: serverTimestamp()
  });
}

// 🔹 Crea un nuevo empleado (si no existe)
export async function registrarNuevoEmpleado({ legajo, nombre, apellido, area, dni }) {
  await addDoc(collection(db, "users"), {
    legajo,
    nombre,
    apellido,
    area,
    dni,
    tipo: "empleado"
  });
}
