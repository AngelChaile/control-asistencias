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
          presentes: data.filter(a => a.tipo === 'ENTRADA').length,
          ausentes: data.filter(a => a.tipo !== 'ENTRADA').length,
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
          <div className="text-gray-600">Total Empleados</div>
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

      {/* QR Generator Section - TEXTO CENTRADO */}
      {rol !== "empleado" && (
        <div className="card p-6 mb-8">
          {/* Header Centrado */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-municipio-500 to-municipio-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">📱</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Generador de QR</h3>
            <p className="text-gray-600 text-lg">Genera códigos QR para registrar asistencias</p>
          </div>
          <QrGenerator area={area} user={user} />
        </div>
      )}
    </div>
  );
}