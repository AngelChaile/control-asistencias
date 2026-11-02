// src/pages/Admin/HomeAdmin.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import QrGenerator from "../../components/QrGenerator";
import { useAuth } from "../../context/AuthContext";
import AppIcon from "../../components/AppIcon";

export default function HomeAdmin() {
  const { user } = useAuth();
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    presentes: 0,
    ausentes: 0
  });

  const rol = user?.rol || "";
  const area = user?.lugarTrabajo || "";

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
        // cargar asistencias (para lista / detalle)
        let qAll;
        if (rol === "rrhh") {
          qAll = query(collection(db, "asistencias"));
        } else if (rol === "admin" && area) {
          qAll = query(collection(db, "asistencias"), where("lugarTrabajo", "==", area));
        } else {
          setLoading(false);
          return;
        }
        const snapAll = await getDocs(qAll);
        const dataAll = snapAll.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAsistencias(dataAll);

        // Estadísticas reales:
        // 1) total empleados (consultar colección empleados por area)
        let totalEmpleados = 0;
        if (rol === "rrhh") {
          const qEmp = query(collection(db, "empleados"));
          const snapEmp = await getDocs(qEmp);
          totalEmpleados = snapEmp.size;
        } else if (rol === "admin" && area) {
          const qEmp = query(collection(db, "empleados"), where("lugarTrabajo", "==", area));
          const snapEmp = await getDocs(qEmp);
          totalEmpleados = snapEmp.size;
        }

        // 2) presentes hoy: asistentes de hoy (tipo ENTRADA) únicos por legajo
        const todayStr = new Date().toLocaleDateString("es-AR");
        const qToday = rol === "rrhh"
          ? query(collection(db, "asistencias"), where("fecha", "==", todayStr))
          : query(collection(db, "asistencias"), where("lugarTrabajo", "==", area), where("fecha", "==", todayStr));
        const snapToday = await getDocs(qToday);
        const todayRows = snapToday.docs.map((d) => ({ id: d.id, ...d.data() }));

        const presentesLegajos = new Set(
          todayRows
            .filter(r => String(r.tipo || "").toLowerCase() === "entrada")
            .map(r => String(r.legajo || ""))
            .filter(Boolean)
        );
        const presentes = presentesLegajos.size;
        const ausentes = Math.max(0, totalEmpleados - presentes);

        setStats({
          totalEmpleados,
          presentes,
          ausentes
        });
      } catch (err) {
        console.error("Error cargando asistencias:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, rol, area]);

  return (
    <div className="app-container space-y-6">
      {/* Header */}
      <div className="page-heading">
        <p className="page-eyebrow">Vista general</p>
        <h1 className="text-gray-900">
          {rol === "rrhh" ? "Panel de Recursos Humanos" : "Panel de tu área"}
        </h1>
        <p className="text-gray-600">{area || "Resumen y gestión de asistencias"}</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="metric-card"><div><p className="metric-label">Total de empleados</p><p className="metric-value">{stats.totalEmpleados}</p><p className="metric-hint">Personal del área</p></div><span className="metric-icon bg-blue-50 text-blue-700"><AppIcon name="users" /></span></div>
        <div className="metric-card"><div><p className="metric-label">Presentes hoy</p><p className="metric-value">{stats.presentes}</p><p className="metric-hint">Con una entrada registrada</p></div><span className="metric-icon bg-green-50 text-green-700"><AppIcon name="check" /></span></div>
        <div className="metric-card"><div><p className="metric-label">Sin entrada hoy</p><p className="metric-value">{stats.ausentes}</p><p className="metric-hint">Según registros de asistencia</p></div><span className="metric-icon bg-amber-50 text-amber-700"><AppIcon name="clock" /></span></div>
      </div>

      {/* QR Generator Section - TEXTO CENTRADO */}
      {rol !== "empleado" && (
        <div className="card p-6 mb-8">
          {/* Header Centrado */}
          <div className="mb-6">
{/*             <div className="w-16 h-16 bg-gradient-to-r from-municipio-500 to-municipio-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">📱</span>
            </div> */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Registro de asistencia por QR</h3>
            <p className="text-gray-600 text-sm">Generá un código para que el personal registre su asistencia.</p>
          </div>
          <QrGenerator area={area} user={user} />
        </div>
      )}
    </div>
  );
}
