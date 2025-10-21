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
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold">Asistencias del día</h2>

        <div className="flex gap-3 mt-3">
          <input className="border rounded px-3 py-2" placeholder="Legajo" value={filter.legajo} onChange={(e) => setFilter({ ...filter, legajo: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Nombre" value={filter.nombre} onChange={(e) => setFilter({ ...filter, nombre: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Lugar de Trabajo" value={filter.lugarTrabajo} onChange={(e) => setFilter({ ...filter, lugarTrabajo: e.target.value })} />
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200" aria-label="Asistencias del día">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Área</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hora</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tipo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 text-sm text-gray-800">{a.legajo}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{a.nombre}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{a.apellido}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{a.lugarTrabajo}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{a.fecha}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{a.hora}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{a.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
