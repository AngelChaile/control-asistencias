function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function esEmpleadoADisposicion(empleado) {
  const lugar = normalizarTexto(empleado?.lugarTrabajo);
  const area = normalizarTexto(empleado?.area?.nombre);
  return lugar.includes("disposicion") || area.includes("disposicion");
}