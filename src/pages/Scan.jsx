import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import Swal from "sweetalert2";

export default function Scan() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [empleado, setEmpleado] = useState(null);

  const token = params.get("token");
  const area = params.get("area");

  useEffect(() => {
    if (!token || !area) {
      Swal.fire("Error", "QR inválido o incompleto", "error");
      setLoading(false);
      return;
    }
    verificarEmpleado();
  }, [token, area]);

  async function verificarEmpleado() {
    try {
      const q = query(collection(db, "empleados"), where("token", "==", token));
      const snap = await getDocs(q);
      if (snap.empty) {
        Swal.fire("Error", "Empleado no encontrado o QR inválido", "error");
        setLoading(false);
        return;
      }
      const emp = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setEmpleado(emp);
      await registrarAsistencia(emp);
    } catch (err) {
      console.error("Error verificando empleado:", err);
      Swal.fire("Error", "No se pudo verificar el empleado", "error");
    } finally {
      setLoading(false);
    }
  }

  async function registrarAsistencia(emp) {
    try {
      const hoy = new Date();
      const fecha = hoy.toLocaleDateString("es-AR");
      const hora = hoy.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

      // Verificar última asistencia
      const q = query(
        collection(db, "asistencias"),
        where("legajo", "==", emp.legajo),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const ultima = snap.docs[0].data();
        if (ultima.createdAt?.seconds) {
          const ultimaHora = new Date(ultima.createdAt.seconds * 1000);
          const diffMin = (hoy - ultimaHora) / 60000;
          if (diffMin < 10) {
            Swal.fire({
              icon: "info",
              title: "Ya registraste tu entrada",
              text: `Tu última marcación fue hace ${diffMin.toFixed(1)} minutos.`,
              timer: 4000,
            });
            return;
          }
        }
      }

      // Registrar nueva asistencia
      await addDoc(collection(db, "asistencias"), {
        nombre: emp.nombre,
        apellido: emp.apellido,
        legajo: emp.legajo,
        tipo: "entrada",
        area,
        lugarTrabajo: emp.area,
        createdAt: new Date(),
        fecha,
        hora,
      });

      Swal.fire({
        icon: "success",
        title: "Asistencia registrada ✅",
        text: `${emp.nombre} ${emp.apellido} - ${hora}`,
        timer: 4000,
      });
    } catch (err) {
      console.error("Error registrando asistencia:", err);
      Swal.fire("Error", "No se pudo registrar la asistencia", "error");
    }
  }

  if (loading) return <p style={{ textAlign: "center" }}>Verificando...</p>;

  if (!empleado)
    return <p style={{ textAlign: "center" }}>No se encontró información del empleado.</p>;

  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h2>Hola, {empleado.nombre} 👋</h2>
      <p>Tu asistencia fue procesada correctamente.</p>
    </div>
  );
}
