// src/pages/RRHH/Vacaciones/FormularioImpresion.jsx
import React, { useRef } from "react";

function fechaEs(valor) {
  if (!valor) return "-";
  const coincidencia = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!coincidencia) return String(valor);
  return new Date(Number(coincidencia[1]), Number(coincidencia[2]) - 1, Number(coincidencia[3])).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parteFecha(valor, parte) {
  const coincidencia = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!coincidencia) return "-";
  if (parte === "dia") return coincidencia[3];
  if (parte === "mes") return coincidencia[2];
  return coincidencia[1];
}

function diaSemana(valor) {
  const coincidencia = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!coincidencia) return "-";
  return new Date(Number(coincidencia[1]), Number(coincidencia[2]) - 1, Number(coincidencia[3])).toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
}

const seccion = { border: "1px solid #1f2937", marginBottom: 14 };
const encabezadoSeccion = { background: "#e5e7eb", borderBottom: "1px solid #1f2937", fontWeight: 700, fontSize: 11, padding: "6px 10px", textTransform: "uppercase" };
const tablaPeriodo = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 };
const encabezadoTabla = { border: "1px solid #1f2937", background: "#e5e7eb", padding: "6px 4px", textAlign: "center", fontWeight: 700 };
const celdaTabla = { border: "1px solid #1f2937", padding: "6px 4px", textAlign: "center", verticalAlign: "middle" };

export default function FormularioImpresion({ solicitud, onVolver }) {
  const printRef = useRef(null);
  const {
    nroSolicitud, legajo, nombreCompleto, area, convenio, esJerarquico,
    fechaIngreso, anioVacacional, diasCorresponden, tipoDias, diasSolicitados,
    fechaDesde, fechaHasta, observaciones, esReingreso, fechaReingreso,
    esCambioConvenio, calculoDetalle,
  } = solicitud;

  const imprimir = () => {
    const ventana = window.open("", "_blank", "width=900,height=900");
    if (!ventana) return;
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Licencia Anual Ordinaria - ${nroSolicitud}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:12px}.page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm 14mm}.no-print{display:none!important}@media print{.page{margin:0;padding:12mm 13mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><main class="page">${printRef.current.innerHTML}</main></body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.onafterprint = () => ventana.close();
    setTimeout(() => ventana.print(), 350);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white">
      <div className="mx-auto mb-4 flex max-w-4xl gap-3 print:hidden">
        <button onClick={onVolver} className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-300">← Volver</button>
        <button onClick={imprimir} className="rounded-xl bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800">🖨️ Imprimir / Guardar PDF</button>
      </div>

      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-7 shadow-lg print:rounded-none print:shadow-none">
        <div ref={printRef}>
          <header style={{ borderBottom: "3px double #111827", paddingBottom: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 42, height: 48, border: "1px solid #111827", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22 }}>M</div>
                <div><p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>MEMO N°</p><p style={{ margin: "3px 0 0", fontWeight: 700 }}>Solicitud N°: {nroSolicitud}</p></div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11 }}><p style={{ margin: 0 }}>SECRETARÍA DE ADMINISTRACIÓN</p><p style={{ margin: "3px 0 0", fontWeight: 800, fontSize: 12 }}>DIRECCIÓN DE RECURSOS HUMANOS</p></div>
            </div>
          </header>

          <h1 style={{ margin: "0 0 16px", textAlign: "center", fontSize: 20, letterSpacing: ".2px" }}>Formulario de Solicitud de Licencia Anual Ordinaria</h1>

          <section style={seccion}>
            <div style={encabezadoSeccion}>Datos personales</div>
            <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 18, padding: "14px 12px" }}>
              <p style={{ margin: 0 }}><strong>Legajo:</strong> {legajo}</p>
              <p style={{ margin: 0 }}><strong>Apellido y nombres:</strong> {nombreCompleto}</p>
            </div>
          </section>

          <section style={seccion}>
            <div style={encabezadoSeccion}>Lugar donde presta servicios</div>
            <div style={{ padding: "12px" }}>
              <p style={{ margin: "0 0 9px" }}><strong>Área / dependencia:</strong> {area || "-"}</p>
              <p style={{ margin: "0 0 9px" }}><strong>Convenio:</strong> {convenio || "-"}{esJerarquico ? " (Jerárquico)" : ""}</p>
              <p style={{ margin: 0 }}><strong>Fecha de ingreso:</strong> {fechaEs(fechaIngreso)}</p>
            </div>
          </section>

          <section style={seccion}>
            <div style={encabezadoSeccion}>Licencia anual ordinaria</div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}><span>Anual: ☒</span><span>Año: <strong>{anioVacacional}</strong></span></div>
              <p style={{ margin: "0 0 14px" }}>Cantidad de días solicitados: <strong>{diasSolicitados}</strong> ({tipoDias || "días"})</p>
              <table style={tablaPeriodo}><colgroup><col style={{ width: "22%" }} /><col style={{ width: "36%" }} /><col style={{ width: "21%" }} /><col style={{ width: "21%" }} /></colgroup><thead><tr><th style={encabezadoTabla}>Duración</th><th style={encabezadoTabla}>Día</th><th style={encabezadoTabla}>Mes</th><th style={encabezadoTabla}>Año</th></tr></thead><tbody>
                <tr><td style={celdaTabla}>Desde</td><td style={celdaTabla}>{parteFecha(fechaDesde, "dia")} ({diaSemana(fechaDesde)})</td><td style={celdaTabla}>{parteFecha(fechaDesde, "mes")}</td><td style={celdaTabla}>{parteFecha(fechaDesde, "anio")}</td></tr>
                <tr><td style={celdaTabla}>Hasta</td><td style={celdaTabla}>{parteFecha(fechaHasta, "dia")} ({diaSemana(fechaHasta)})</td><td style={celdaTabla}>{parteFecha(fechaHasta, "mes")}</td><td style={celdaTabla}>{parteFecha(fechaHasta, "anio")}</td></tr>
              </tbody></table>
              <p style={{ margin: "12px 0 0", fontSize: 10 }}>Días que corresponden al período: {diasCorresponden} ({tipoDias || "-"}).</p>
              {(esReingreso || esCambioConvenio) && <p style={{ margin: "7px 0 0", fontSize: 10 }}><strong>Situación especial:</strong> {esReingreso ? `Reingreso: ${fechaEs(fechaReingreso)}. ` : ""}{esCambioConvenio ? `Cambio de convenio. ${calculoDetalle?.desglose ? "Cálculo proporcional aplicado." : ""}` : ""}</p>}
              <div style={{ borderTop: "1px solid #111827", margin: "42px 20px 0", paddingTop: 6, textAlign: "center" }}>Firma del solicitante</div>
            </div>
          </section>

          {observaciones && <section style={seccion}><div style={encabezadoSeccion}>Observaciones</div><p style={{ minHeight: 36, margin: 0, padding: "10px 12px" }}>{observaciones}</p></section>}

          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 16 }}><tbody><tr>
            <td style={{ width: "50%", paddingRight: 7, verticalAlign: "top" }}><PanelAutorizacion titulo="A completar por la autoridad del área a la que pertenece" opciones={["Autorizada", "Rechazada por razones de servicio"]} /></td>
            <td style={{ width: "50%", paddingLeft: 7, verticalAlign: "top" }}><PanelAutorizacion titulo="A completar por la Dirección de RR.HH." opciones={["Autorizada", "Interrumpida por otros motivos"]} /></td>
          </tr><tr>
            <td style={{ paddingRight: 20, paddingTop: 58, verticalAlign: "top" }}><Firma texto="Autorización del Director / Secretario / Subsecretario" /></td>
            <td style={{ paddingLeft: 20, paddingTop: 58, verticalAlign: "top" }}><Firma texto="Autorización de la Dirección de RR.HH." /></td>
          </tr></tbody></table>
          <div style={{ borderTop: "1px solid #9ca3af", marginTop: 26, paddingTop: 8, textAlign: "center", color: "#4b5563", fontSize: 9 }}>Documento generado por el Sistema de Control de Asistencias - {new Date().toLocaleDateString("es-AR")}</div>
        </div>
      </div>
    </div>
  );
}

function PanelAutorizacion({ titulo, opciones }) {
  return <section style={{ ...seccion, marginBottom: 0, background: "#f3f4f6", minHeight: 172 }}>
    <div style={{ ...encabezadoSeccion, minHeight: 34, display: "flex", alignItems: "center" }}>{titulo}</div>
    <div style={{ padding: "13px 12px", fontSize: 11 }}>
      <p style={{ margin: "0 0 11px" }}>Esta licencia se encuentra:</p>
      {opciones.map(opcion => <p key={opcion} style={{ margin: "0 0 9px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{opcion}</span><span style={{ border: "1px solid #111827", display: "inline-block", height: 15, width: 15 }} /></p>)}
      <p style={{ margin: "14px 0 0", borderBottom: "1px solid #6b7280", paddingBottom: 5 }}>Especificar:</p>
      <p style={{ margin: "10px 0 0", borderBottom: "1px solid #6b7280", paddingBottom: 5 }}>&nbsp;</p>
    </div>
  </section>;
}

function Firma({ texto }) {
  return <div style={{ borderTop: "1px solid #111827", paddingTop: 6, textAlign: "center", fontSize: 10 }}>{texto}</div>;
}
