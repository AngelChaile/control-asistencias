// src/pages/RRHH/Vacaciones/FormularioImpresion.jsx
// Vista de impresión del formulario de Licencia Anual Ordinaria
import React, { useRef } from "react";

function formatFecha(str) {
  if (!str) return "—";
  // yyyy-mm-dd → dd/mm/yyyy
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return str;
}

export default function FormularioImpresion({ solicitud, onVolver }) {
  const printRef = useRef();

  const handlePrint = () => {
    const contenido = printRef.current.innerHTML;
    const ventana = window.open("", "_blank", "width=900,height=700");
    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Licencia Anual Ordinaria - ${solicitud.nroSolicitud}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }
          .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 18mm; }
          h1 { font-size: 16px; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .subtitulo { text-align: center; font-size: 11px; color: #444; margin-bottom: 20px; }
          .nro { text-align: right; font-size: 11px; margin-bottom: 16px; }
          .seccion { margin-bottom: 16px; }
          .seccion-titulo { font-size: 11px; font-weight: bold; text-transform: uppercase;
            border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; letter-spacing: 0.5px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 20px; }
          .campo { margin-bottom: 8px; }
          .campo label { font-size: 10px; color: #555; display: block; margin-bottom: 2px; }
          .campo .valor { border-bottom: 1px solid #999; min-height: 20px; padding: 2px 4px; font-size: 12px; }
          .resaltado { background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; padding: 8px 12px;
            display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
          .resaltado .num { font-size: 28px; font-weight: bold; }
          .resaltado .desc { font-size: 11px; color: #333; }
          .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
          .firma-box { text-align: center; }
          .firma-linea { border-top: 1px solid #000; margin-top: 60px; padding-top: 6px; font-size: 11px; }
          .obs { border: 1px solid #ccc; border-radius: 4px; min-height: 50px; padding: 8px; font-size: 11px; color: #333; }
          .badge { display: inline-block; background: #e8e8e8; border-radius: 4px; padding: 2px 8px;
            font-size: 10px; font-weight: bold; text-transform: uppercase; }
          .pie { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px;
            font-size: 9px; color: #888; text-align: center; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { padding: 15mm 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="page">${contenido}</div>
      </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => { ventana.print(); ventana.close(); }, 400);
  };

  const {
    nroSolicitud, legajo, nombreCompleto, cargo, area, convenio,
    esJerarquico, fechaIngreso, anioVacacional,
    diasCorresponden, tipoDias, diasSolicitados,
    fechaDesde, fechaHasta, observaciones,
    esReingreso, fechaReingreso, esCambioConvenio,
    calculoDetalle,
  } = solicitud;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      {/* Barra de acciones (no se imprime) */}
      <div className="max-w-4xl mx-auto mb-4 flex gap-3 print:hidden">
        <button
          onClick={onVolver}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-xl transition"
        >
          ← Volver
        </button>
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl transition"
        >
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      {/* Formulario imprimible */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8 print:shadow-none print:rounded-none">
        <div ref={printRef}>
          {/* Encabezado */}
          <h1 style={{ fontSize: 18, textAlign: "center", textTransform: "uppercase", fontWeight: "bold", letterSpacing: 1, marginBottom: 4 }}>
            Licencia Anual Ordinaria
          </h1>
          <p style={{ textAlign: "center", fontSize: 12, color: "#555", marginBottom: 20 }}>
            Municipalidad — Solicitud de Vacaciones
          </p>
          <p style={{ textAlign: "right", fontSize: 11, marginBottom: 16 }}>
            <strong>N° Solicitud:</strong> {nroSolicitud} &nbsp;|&nbsp;
            <strong>Período:</strong> {anioVacacional}
          </p>

          {/* Datos del agente */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: "bold", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #000", paddingBottom: 3, marginBottom: 10 }}>
              Datos del agente
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
              <Campo label="Apellido y Nombre" valor={nombreCompleto} />
              <Campo label="Legajo" valor={legajo} />
              <Campo label="Cargo" valor={cargo || "—"} />
              <Campo label="Área / Secretaría" valor={area || "—"} />
              <Campo label="Convenio" valor={`${convenio}${esJerarquico ? " (Jerárquico)" : ""}`} />
              <Campo label="Fecha de ingreso" valor={formatFecha(fechaIngreso)} />
            </div>
          </div>

          {/* Casos especiales */}
          {(esReingreso || esCambioConvenio) && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: "bold", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #000", paddingBottom: 3, marginBottom: 10 }}>
                Situación especial
              </p>
              {esReingreso && (
                <p style={{ fontSize: 11, marginBottom: 6 }}>
                  <strong>Reingreso:</strong> {formatFecha(fechaReingreso)} —
                  Proporcional por {calculoDetalle?.mesesTrabajados ?? "—"} mes(es) trabajados.
                </p>
              )}
              {esCambioConvenio && calculoDetalle?.desglose && (
                <p style={{ fontSize: 11, marginBottom: 6 }}>
                  <strong>Cambio de convenio:</strong>{" "}
                  {calculoDetalle.desglose.convenioAnterior} ({calculoDetalle.desglose.mesesAnterior} meses, {calculoDetalle.desglose.diasAnterior} días) +{" "}
                  {calculoDetalle.desglose.convenioNuevo} ({calculoDetalle.desglose.mesesNuevo} meses, {calculoDetalle.desglose.diasNuevo} días)
                </p>
              )}
            </div>
          )}

          {/* Días de vacaciones */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: "bold", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #000", paddingBottom: 3, marginBottom: 10 }}>
              Licencia
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 16px" }}>
              <Campo label="Días que corresponden al período" valor={`${diasCorresponden} (${tipoDias})`} />
              <Campo
                label={`Días de esta licencia (${tipoDias})`}
                valor={String(diasSolicitados)}
              />
              <Campo label="Fecha desde" valor={formatFecha(fechaDesde)} />
              <Campo label="Fecha hasta" valor={formatFecha(fechaHasta)} />
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#555", background: "#f8f8f8", border: "1px solid #ddd", borderRadius: 4, padding: "6px 10px" }}>
              {tipoDias === "habiles"
                ? `Los ${diasSolicitados} días son hábiles (excluye sábados, domingos y feriados nacionales).`
                : `Los ${diasSolicitados} días son corridos (días calendario).`
              }
            </div>
          </div>

          {/* Observaciones */}
          {observaciones && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: "bold", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #000", paddingBottom: 3, marginBottom: 8 }}>
                Observaciones
              </p>
              <p style={{ fontSize: 11, border: "1px solid #ccc", borderRadius: 4, padding: "8px 10px", minHeight: 40 }}>
                {observaciones}
              </p>
            </div>
          )}

          {/* Firmas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, marginTop: 50 }}>
            <FirmaBox titulo="Firma del Responsable del Área" subtitulo="Aclaración y sello" />
            <FirmaBox titulo="Firma del Empleado" subtitulo="Aclaración" />
          </div>

          {/* Pie */}
          <p style={{ marginTop: 30, borderTop: "1px solid #ccc", paddingTop: 10, fontSize: 9, color: "#888", textAlign: "center" }}>
            Documento generado por el Sistema de Control de Asistencias — {new Date().toLocaleDateString("es-AR")}
          </p>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>{label}</p>
      <p style={{ borderBottom: "1px solid #999", minHeight: 20, padding: "2px 4px", fontSize: 12 }}>
        {valor}
      </p>
    </div>
  );
}

function FirmaBox({ titulo, subtitulo }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ borderTop: "1px solid #000", marginTop: 70, paddingTop: 6 }}>
        <p style={{ fontSize: 11, fontWeight: "bold" }}>{titulo}</p>
        <p style={{ fontSize: 10, color: "#666" }}>{subtitulo}</p>
      </div>
    </div>
  );
}
