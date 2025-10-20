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

  // Aplicar autofilter al rango de la hoja
  if (ws["!ref"]) {
    try {
      ws["!autofilter"] = { ref: ws["!ref"] };
    } catch (e) {
      // noop
    }
  }

  // Ajustar anchos de columnas según longitud de cabeceras/valores
  try {
    const keys = Object.keys(rows[0]);
    const cols = keys.map((k) => {
      const maxLen =
        Math.max(
          k.length,
          ...rows.map((r) => {
            const v = r[k];
            return v === null || v === undefined ? 0 : String(v).length;
          })
        ) + 2;
      return { wch: Math.min(Math.max(maxLen, 10), 50) };
    });
    ws["!cols"] = cols;
  } catch (e) {
    // noop
  }

  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/**
 * Componente simple: botón que descarga el Excel
 * Props:
 *  - data: array de objetos
 *  - filename: nombre del archivo (.xlsx opcional)
 *  - children: contenido del botón
 */
export default function ExportCSV({ data = [], filename = "export.xlsx", children }) {
  const onClick = () => exportToExcel(filename, data);
  return (
    <button type="button" onClick={onClick} className="bg-green-600 text-white px-3 py-1 rounded">
      {children || "Exportar Excel"}
    </button>
  );
}
