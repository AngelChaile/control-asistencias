import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import QrGenerator from "../../components/QrGenerator";
import { useAuth } from "../../context/AuthContext";

export default function HomeAdmin() {
  const { user } = useAuth();
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const rol = user?.rol || "";
  const area = user?.lugarTrabajo || "";

  useEffect(() => {
    if (!user) return;

    async function fetchAsistencias() {
      setLoading(true);
      try {
        let q;
        if (rol === "rrhh") {
          q = query(collection(db, "asistencias"));
        } else if (rol === "admin" && area) {
          q = query(
            collection(db, "asistencias"),
            where("lugarTrabajo", "==", area)
          );
        } else {
          setLoading(false);
          return;
        }

        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAsistencias(data);
      } catch (err) {
        console.error("Error cargando asistencias:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAsistencias();
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold">Panel {rol === "rrhh" ? "Recursos Humanos" : `Área ${area}`}</h2>

        {rol !== "empleado" && (
          <div className="my-4">
            <QrGenerator area={area} user={user} />
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Cargando asistencias...</p>
        ) : asistencias.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Tabla de asistencias">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Legajo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Apellido</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tipo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hora</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Área</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {asistencias.map((a) => {
                  const fecha = a.fecha?.seconds
                    ? new Date(a.fecha.seconds * 1000).toLocaleDateString("es-AR")
                    : a.fecha || "";
                  const hora = a.hora?.seconds
                    ? new Date(a.hora.seconds * 1000).toLocaleTimeString("es-AR")
                    : a.hora || "";
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-sm text-gray-800">{a.legajo}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{a.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{a.apellido}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{a.tipo}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{fecha}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{hora}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{a.lugarTrabajo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No hay asistencias registradas.</p>
        )}
      </div>
    </div>
  );
}
