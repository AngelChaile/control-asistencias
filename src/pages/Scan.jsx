import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import Swal from "sweetalert2";

export default function Scan() {
  const [legajo, setLegajo] = useState("");
  const [areaQR, setAreaQR] = useState("");
  const [empleado, setEmpleado] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: "",
    apellido: "",
    legajo: "",
    lugarTrabajo: "",
  });

  async function handleBuscarEmpleado() {
    try {
      const q = query(collection(db, "users"), where("legajo", "==", legajo));
      const snap = await getDocs(q);

      if (snap.empty) {
        setShowForm(true);
        setNuevoEmpleado((prev) => ({ ...prev, legajo, lugarTrabajo: areaQR }));
        Swal.fire("Empleado no encontrado", "Por favor complete sus datos.", "info");
      } else {
        const data = snap.docs[0].data();
        setEmpleado(data);
        registrarAsistencia(data);
      }
    } catch (err) {
      console.error("Error buscando empleado:", err);
      Swal.fire("Error", "Ocurrió un error al buscar el empleado.", "error");
    }
  }

  async function registrarAsistencia(empData) {
    try {
      const fecha = new Date();
      const asistencia = {
        legajo: empData.legajo,
        nombre: empData.nombre,
        apellido: empData.apellido,
        tipo: "Entrada",
        fecha: fecha.toLocaleDateString(),
        hora: fecha.toLocaleTimeString(),
        lugarTrabajo: empData.lugarTrabajo,
        areaQR,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "asistencias"), asistencia);

      Swal.fire("Éxito", "Asistencia registrada correctamente.", "success");
      setLegajo("");
    } catch (err) {
      console.error("Error registrando asistencia:", err);
      Swal.fire("Error", "No se pudo registrar la asistencia.", "error");
    }
  }

  async function handleGuardarEmpleado() {
    try {
      await addDoc(collection(db, "users"), nuevoEmpleado);
      Swal.fire("Empleado agregado", "Ahora se registrará la asistencia.", "success");
      registrarAsistencia(nuevoEmpleado);
      setShowForm(false);
      setNuevoEmpleado({ nombre: "", apellido: "", legajo: "", lugarTrabajo: "" });
    } catch (err) {
      console.error("Error guardando empleado:", err);
      Swal.fire("Error", "No se pudo guardar el empleado.", "error");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Registro de Asistencia</h2>
      <label>
        Área del QR:
        <input
          value={areaQR}
          onChange={(e) => setAreaQR(e.target.value)}
          placeholder="Ej: Recursos Humanos"
        />
      </label>
      <br />
      <label>
        Legajo:
        <input
          value={legajo}
          onChange={(e) => setLegajo(e.target.value)}
          placeholder="Ej: 1234"
        />
      </label>
      <br />
      <button onClick={handleBuscarEmpleado}>Registrar asistencia</button>

      {showForm && (
        <div style={{ marginTop: 20 }}>
          <h3>Agregar nuevo empleado</h3>
          <input
            placeholder="Nombre"
            value={nuevoEmpleado.nombre}
            onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })}
          />
          <input
            placeholder="Apellido"
            value={nuevoEmpleado.apellido}
            onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, apellido: e.target.value })}
          />
          <input
            placeholder="Legajo"
            value={nuevoEmpleado.legajo}
            onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, legajo: e.target.value })}
          />
          <input
            placeholder="Lugar de trabajo"
            value={nuevoEmpleado.lugarTrabajo}
            onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, lugarTrabajo: e.target.value })}
          />
          <button onClick={handleGuardarEmpleado}>Guardar empleado</button>
        </div>
      )}
    </div>
  );
}
