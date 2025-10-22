import React from "react";
import * as XLSX from "xlsx"; 

/**
 * exportToExcel(filename, rows)
 * rows: array de objetos [{col1: val, col2: val}, ...]
 */
export function exportToExcel(filename, rows = []) {
  if (!Array.isArray(rows)) rows = [];

  const wb = XLSX.utils.book_new();

  // Si no hay filas, crear hoja vacía con mensaje
  if (rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["No hay datos"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
    return;
  }

  // Usar json_to_sheet para generar tabla
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar anchos de columnas
  try {
    const keys = Object.keys(rows[0]);
    ws["!cols"] = keys.map(k => ({
      wch: Math.min(Math.max(k.length, ...rows.map(r => String(r[k] || "").length)), 50)
    }));
  } catch {}

  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}


/**
 * Botón que descarga el Excel

 * Componente simple: botón que descarga el Excel
 * Props:
 *  - data: array de objetos
 *  - filename: nombre del archivo (.xlsx opcional)
 *  - children: contenido del botón
 */
export default function ExportExcel({ data = [], filename = "report.xlsx", children }) {
  const onClick = () => exportToExcel(filename, data);
  return (
    <button type="button" onClick={onClick} className="bg-municipio-500 text-white px-3 py-1 rounded shadow hover:bg-municipio-600">
      {children || "Exportar Excel"}
    </button>
  );
}



