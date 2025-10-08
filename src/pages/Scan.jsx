import React, { useEffect, useState } from "react";
import { db, collection, getDocs, query, where, addDoc, updateDoc, doc } from "../firebase";

export default function Scan() {
  const [status, setStatus] = useState("Verificando token...");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const area = params.get("area") || params.get("place") || "Desconocido";

  useEffect(() => {
    async function validateAndRegister() {
      try {
        if (!token) { setStatus("Token no válido"); return; }

        // Buscar token en Firestore tokens collection
        const q = query(collection(db, "tokens"), where("token", "==", token));
        const snap = await getDocs(q);
        if (snap.empty) { setStatus("Token inválido o expirado"); return; }
        const docu = snap.docs[0];
        const tdata = docu.data();

        // check expiry and used
        const expires = new Date(tdata.expiresAt);
        if (tdata.used || expires < new Date()) {
          setStatus("Token expirado o ya usado");
          return;
        }

        // Ask user for legajo or check localStorage
        const stored = localStorage.getItem("empleado");
        let legajo;
        if (stored) {
          const obj = JSON.parse(stored);
          legajo = obj.legajo;
        } else {
          legajo = prompt("Ingresá tu legajo (si es tu primer registro se guardará)");
          if (!legajo) { setStatus("Legajo requerido"); return; }
        }

        // Find employee
        const q2 = query(collection(db, "empleados"), where("legajo", "==", legajo));
        const eSnap = await getDocs(q2);

        let empleado;
        if (eSnap.empty) {
          // primer registro: ask basic data
          const nombre = prompt("Nombre");
          const apellido = prompt("Apellido");
          if (!nombre) { setStatus("Registro cancelado"); return; }
          const empDoc = await addDoc(collection(db, "empleados"), {
            legajo, nombre, apellido, area, horario: ""
          });
          empleado = { legajo, nombre, apellido, id: empDoc.id, area };
          localStorage.setItem("empleado", JSON.stringify(empleado));
        } else {
          empleado = { id: eSnap.docs[0].id, ...eSnap.docs[0].data() };
        }

        // Decide ENTRADA/SALIDA by counting today's records
        const today = new Date().toISOString().slice(0,10);
        const attQ = query(collection(db, "asistencias"),
                          where("legajo", "==", legajo),
                          where("fecha", "==", today));
        const attSnap = await getDocs(attQ);
        const count = attSnap.size;
        const tipo = (count % 2 === 0) ? "ENTRADA" : "SALIDA";

        // append attendance
        await addDoc(collection(db, "asistencias"), {
          legajo,
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          area,
          tipo,
          fecha: today,
          hora: new Date().toLocaleTimeString(),
          createdAt: new Date().toISOString()
        });

        // mark token used
        await updateDoc(doc(db, "tokens", docu.id), { used: true });

        setStatus(`Registro OK: ${tipo} - ${empleado.nombre} ${empleado.apellido}`);
      } catch (err) {
        console.error(err);
        setStatus("Error procesando fichada");
      }
    }

    validateAndRegister();
  }, [token, area]);

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>Registro de Asistencia</h2>
      <p>{status}</p>
    </div>
  );
}
