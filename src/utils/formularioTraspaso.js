const escapeHtml = (valor) => String(valor || '-').replace(/[&<>'"]/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[caracter]));

const fecha = (valor) => {
  const date = valor?.toDate?.() || (valor ? new Date(valor) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('es-AR') : '-';
};

// Abre una hoja lista para imprimir o guardar como PDF desde el diálogo del navegador.
export function descargarFormularioTraspaso(solicitud) {
  const ventana = window.open('', '_blank');
  if (!ventana) return;
  const empleado = solicitud.empleado || {};
  const filasPedido = solicitud.tipoSolicitud === 'solicitud_personal'
    ? `<tr><th>Personal solicitado</th><td>${escapeHtml((solicitud.necesidades || []).map(item => `${item.funcion}: ${item.cantidadAsignada || 0}/${item.cantidad}`).join(' · '))}</td></tr>`
    : '';
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Formulario de traspaso</title><style>body{font-family:Arial,sans-serif;color:#172033;max-width:800px;margin:36px auto;padding:0 24px}h1{text-align:center;font-size:22px}h2{font-size:16px;margin-top:28px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #94a3b8;padding:10px;text-align:left}th{width:35%;background:#f1f5f9}.firmas{display:flex;gap:48px;justify-content:space-between;margin-top:90px}.firma{width:42%;border-top:1px solid #334155;padding-top:8px;text-align:center;font-size:13px}.pie{margin-top:28px;font-size:12px;color:#475569}@media print{body{margin:0}}</style></head><body>
    <h1>Formulario de Traspaso de Personal</h1><p style="text-align:center">Fecha de emisión: ${fecha(new Date())}</p>
    <h2>Datos del empleado</h2><table><tr><th>Nombre y apellido</th><td>${escapeHtml(empleado.nombre)}</td></tr><tr><th>Legajo</th><td>${escapeHtml(empleado.legajo)}</td></tr><tr><th>Función</th><td>${escapeHtml(empleado.funcion)}</td></tr></table>
    <h2>Movimiento</h2><table><tr><th>Área de origen</th><td>${escapeHtml(empleado.areaOrigen?.nombre)}</td></tr><tr><th>Área de destino</th><td>${escapeHtml(solicitud.areaDestino?.nombre)}</td></tr><tr><th>Motivo</th><td>${escapeHtml(solicitud.motivo)}</td></tr><tr><th>Observaciones</th><td>${escapeHtml(solicitud.observaciones)}</td></tr><tr><th>Fecha de aprobación</th><td>${fecha(solicitud.fechaEjecucion || solicitud.updatedAt)}</td></tr>${filasPedido}</table>
    <div class="firmas"><div class="firma">Firma y aclaración<br>Subsecretario / Responsable</div><div class="firma">Firma y aclaración<br>Empleado</div></div><p class="pie">Documento generado por Control de Asistencias.</p><script>window.onload=()=>window.print()</script></body></html>`);
  ventana.document.close();
}
