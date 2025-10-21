import React, { useEffect, useState } from "react";
import { db, collection, getDocs, query, orderBy } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

export default function HomeRRHH() {
  const { user } = useAuth();

  const [asistencias, setAsistencias] = useState([]);
  const [filter, setFilter] = useState({ legajo: "", nombre: "", lugarTrabajo: "" });

  useEffect(() => {
    fetchAsistencias();
  }, []);

  async function fetchAsistencias() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const snap = await getDocs(
      query(collection(db, "asistencias"), orderBy("createdAt", "desc"))
    );
    const lista = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => {
        const created = a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt.seconds * 1000);
        return created >= today;
      });
    setAsistencias(lista);
  }

  const filtered = asistencias.filter(
    (a) =>
      (filter.legajo === "" || a.legajo.includes(filter.legajo)) &&
      (filter.nombre === "" ||
        a.nombre.toLowerCase().includes(filter.nombre.toLowerCase())) &&
      (filter.lugarTrabajo === "" ||
        (a.lugarTrabajo || "").toLowerCase().includes(filter.lugarTrabajo.toLowerCase()))
  );

  return (
    <div className="app-container">
      <div className="card">
        <h2>Asistencias del día</h2>

        <div className="flex" style={{ gap: 12, marginTop: 12 }}>
          <input
            placeholder="Legajo"
            value={filter.legajo}
            onChange={(e) => setFilter({ ...filter, legajo: e.target.value })}
          />
          <input
            placeholder="Nombre"
            value={filter.nombre}
            onChange={(e) => setFilter({ ...filter, nombre: e.target.value })}
          />
          <input
            placeholder="Lugar de Trabajo"
            value={filter.lugarTrabajo}
            onChange={(e) => setFilter({ ...filter, lugarTrabajo: e.target.value })}
          />
        </div>

        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table className="table" aria-label="Asistencias del día">
            <thead>
              <tr>
                <th>Legajo</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Área</th>
                <th>Hora</th>
                <th>Fecha</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>{a.legajo}</td>
                  <td>{a.nombre}</td>
                  <td>{a.apellido}</td>
                  <td>{a.lugarTrabajo}</td>
                  <td>{a.fecha}</td>
                  <td>{a.hora}</td>
                  <td>{a.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
