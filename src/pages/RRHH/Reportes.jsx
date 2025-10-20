import React from "react";
import ReportesAdmin from "../Admin/ReportesAdmin";

/**
 * RRHH Reportes: mismo componente que Admin pero RRHH puede ver todas las áreas.
 * Reusa ReportesAdmin, porque en su lógica se detecta user.rol y si es "rrhh" no se limita por área.
 */
export default function ReportesRRHH() {
  return <ReportesAdmin />;
}