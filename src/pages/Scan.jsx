import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useSearchParams } from "react-router-dom";

export default function Scan() {
  const [searchParams] = useSearchParams();
  const area = searchParams.get("area");
  const token = searchParams.get("token");

  const [legajo, setLegajo] = useState("");
  const [empleado, setEmpleado] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [loading, setLoading] = useState(false);

  async function buscarEmpleado(e) {
    e.preventDefault();
    if (!legajo) return alert("Por favor ingrese un legajo.");

    try {
      setLoading(true);
      const q = query(collection(db, "users"), where("legajo", "==", legajo));
      const snap = await getDocs(q);

      if (snap.empty) {
        // No existe → mostrar formulario para crear nuevo empleado
        setNuevo(true);
        setEmpleado(null);
      } else {
        // Empleado encontrado
        const data = snap.docs[0].data();
        setEmpleado({ ...data, id: snap.docs[0].id });
        setNuevo(false);
      }
    } catch (err) {
      console.error("Error al buscar empleado:", err);
      alert("❌ Error Ocurrió un error al buscar el empleado.");
    } finally {
      setLoading(false);
    }
  }

  async function registrarAsistencia(tipo = "Entrada") {
    if (!empleado) return alert("Primero busque un empleado válido.");
    if (!area || !token)
      return alert("Error: QR inválido o incompleto. Genere un nuevo QR.");

    try {
      setLoading(true);
      const fecha = new Date();
      const fechaStr = fecha.toLocaleDateString("es-AR");
      const horaStr = fecha.toLocaleTimeString("es-AR");

      await addDoc(collection(db, "asistencias"), {
        legajo: empleado.legajo,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        areaQR: area,
        lugarTrabajo: area,
        tipo,
        fecha: fechaStr,
        hora: horaStr,
        createdAt: serverTimestamp(),
      });

      alert(`✅ ${empleado.nombre} ${empleado.apellido} registró ${tipo} correctamente.`);
      setLegajo("");
      setEmpleado(null);
    } catch (err) {
      console.error("Error al registrar asistencia:", err);
      alert("❌ Error No se pudo registrar la asistencia.");
    } finally {
      setLoading(false);
    }
  }

  async function guardarNuevoEmpleado(e) {
    e.preventDefault();
    const nombre = e.target.nombre.value.trim();
    const apellido = e.target.apellido.value.trim();
    const lugarTrabajo = area;

    if (!nombre || !apellido) return alert("Complete todos los campos.");

    try {
      setLoading(true);
      await addDoc(collection(db, "users"), {
        legajo,
        nombre,
        apellido,
        lugarTrabajo,
        createdAt: serverTimestamp(),
      });

      alert("✅ Empleado agregado correctamente. Ahora registre su asistencia.");
      setNuevo(false);
      setEmpleado({ legajo, nombre, apellido, lugarTrabajo });
    } catch (err) {
      console.error("Error al agregar empleado:", err);
      alert("❌ Error al guardar el nuevo empleado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>Registro de Asistencia</h2>
      <p>📍 Área: <b>{area || "Desconocida"}</b></p>

      {!empleado && !nuevo && (
        <form onSubmit={buscarEmpleado}>
          <input
            type="text"
            placeholder="Ingrese Legajo"
            value={legajo}
            onChange={(e) => setLegajo(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>
      )}

      {empleado && (
        <div style={{ marginTop: 20 }}>
          <h3>{empleado.nombre} {empleado.apellido}</h3>
          <p>Legajo: {empleado.legajo}</p>
          <p>Área: {area}</p>

          <button onClick={() => registrarAsistencia("Entrada")} disabled={loading}>
            Registrar Entrada
          </button>
          <button onClick={() => registrarAsistencia("Salida")} disabled={loading}>
            Registrar Salida
          </button>
        </div>
      )}

      {nuevo && (
        <form onSubmit={guardarNuevoEmpleado} style={{ marginTop: 20 }}>
          <h4>Empleado no encontrado. Registrar nuevo:</h4>
          <input name="nombre" placeholder="Nombre" required />
          <input name="apellido" placeholder="Apellido" required />
          <button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar empleado"}
          </button>
        </form>
      )}
    </div>
  );
}
