// src/pages/Admin/HomeAdmin.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import QrGenerator from "../../components/QrGenerator";
import { useAuth } from "../../context/AuthContext";

export default function HomeAdmin() {
  const { user } = useAuth();
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    presentes: 0,
    ausentes: 0
  });

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
        
        // Calcular estadísticas simples
        setStats({
          total: data.length,
          presentes: data.filter(a => a.tipo === 'entrada').length,
          ausentes: data.filter(a => a.ausentes === true).length // Prueba para ver si funciona mostar los ausentes
        });
      } catch (err) {
        console.error("Error cargando asistencias:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAsistencias();
  }, [user, rol, area]);

  return (
    <div className="app-container space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Panel {rol === "rrhh" ? "Recursos Humanos" : `Administración - ${area}`}
        </h1>
        <p className="text-gray-600">Resumen y gestión de asistencias en tiempo real</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">{stats.total}</div>
          <div className="text-gray-600">Total Asistencias</div>
          <div className="w-12 h-1 bg-blue-500 rounded mx-auto mt-3"></div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">{stats.presentes}</div>
          <div className="text-gray-600">Presentes Hoy</div>
          <div className="w-12 h-1 bg-green-500 rounded mx-auto mt-3"></div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-red-600 mb-2">{stats.ausentes}</div>
          <div className="text-gray-600">Ausentes Hoy</div>
          <div className="w-12 h-1 bg-red-500 rounded mx-auto mt-3"></div>
        </div>
      </div>

      {/* QR Generator Section */}
      {rol !== "empleado" && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Generador de QR</h3>
              <p className="text-gray-600">Genera códigos QR para registrar asistencias</p>
            </div>
          </div>
          <QrGenerator area={area} user={user} />
        </div>
      )}

      {/* Asistencias Table */}
{/*       <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Registro de Asistencias</h3>
            <p className="text-gray-600">Historial completo de registros</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : asistencias.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {asistencias.map((a) => {
                  const fecha = a.fecha?.seconds
                    ? new Date(a.fecha.seconds * 1000).toLocaleDateString("es-AR")
                    : a.fecha || "";
                  const hora = a.hora?.seconds
                    ? new Date(a.hora.seconds * 1000).toLocaleTimeString("es-AR")
                    : a.hora || "";
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-sm">
                              {a.nombre?.[0]}{a.apellido?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {a.nombre} {a.apellido}
                            </div>
                            <div className="text-sm text-gray-500">Legajo: {a.legajo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          a.tipo === 'entrada' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {a.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fecha}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hora}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {a.lugarTrabajo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros</h3>
            <p className="text-gray-600">No se encontraron asistencias registradas.</p>
          </div>
        )}
      </div> */}
    </div>
  );
}