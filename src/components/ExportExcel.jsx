import React from "react";
import * as XLSX from "xlsx"; 

/**
 * exportToExcel(filename, rows)
 * rows: array de objetos [{col1: val, col2: val}, ...]
 */
// src/components/ExportExcel.jsx - Modificación para aceptar AOA
export async function exportToExcel(filename, data = [], columnOrder = null) {
  const XLSX = await import('xlsx');
  const lib = XLSX.default || XLSX;

  const wb = lib.utils.book_new();

  if (!data || data.length === 0) {
    const ws = lib.utils.aoa_to_sheet([["No hay datos"]]);
    lib.utils.book_append_sheet(wb, ws, "Report");
    lib.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
    return;
  }

  let ws;

  // ✅ Detectar si es AOA (array de arrays) o JSON (array de objetos)
  if (Array.isArray(data[0])) {
    // Es AOA
    ws = lib.utils.aoa_to_sheet(data);
  } else {
    // Es JSON
    let jsonData = data;
    if (columnOrder && Array.isArray(columnOrder)) {
      jsonData = data.map(row => {
        const nuevo = {};
        columnOrder.forEach(key => {
          if (row.hasOwnProperty(key)) nuevo[key] = row[key];
        });
        Object.keys(row).forEach(key => {
          if (!columnOrder.includes(key)) nuevo[key] = row[key];
        });
        return nuevo;
      });
    }
    ws = lib.utils.json_to_sheet(jsonData);
  }

  // Ajustar anchos de columnas
  try {
    const keys = Array.isArray(data[0]) ? data[0] : Object.keys(data[0]);
    ws["!cols"] = keys.map((k, i) => ({
      wch: Math.min(Math.max(String(k).length, ...data.map(r => String(Array.isArray(r) ? r[i] : r[k] || "").length)), 50)
    }));
  } catch {}

  lib.utils.book_append_sheet(wb, ws, "Report");
  lib.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
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
  const onClick = async () => {
    try {
      await exportToExcel(filename, data);
    } catch (err) {
      console.error('Error exporting excel', err);
      alert('Error al exportar. Revisa la consola para más detalles.');
    }
  };

  return (
    <button type="button" onClick={onClick} className="bg-municipio-500 text-white px-3 py-1 rounded shadow hover:bg-municipio-600">
      {children || "Exportar Excel"}
    </button>
  );
}



