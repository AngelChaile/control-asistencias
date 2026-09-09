export function formatearFecha(fecha) {
  if (fecha === null || fecha === undefined || fecha === "") return "-";

  if (fecha?.toDate) return fecha.toDate().toLocaleDateString("es-AR");
  if (fecha instanceof Date) return fecha.toLocaleDateString("es-AR");

  const valor = typeof fecha === "string" ? fecha.trim() : fecha;

  const esAnio = (typeof valor === "number" || typeof valor === "string") &&
    /^\d{4}$/.test(String(valor)) && Number(valor) >= 1900 && Number(valor) <= 2100;

  if (!esAnio && (typeof valor === "number" || (typeof valor === "string" && /^\d+(\.\d+)?$/.test(valor)))) {
    const serial = Number(valor);
    const fechaExcel = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return fechaExcel.toLocaleDateString("es-AR", { timeZone: "UTC" });
  }

  if (typeof valor === "string") {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    if (isoMatch) {
      return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
        .toLocaleDateString("es-AR", { timeZone: "UTC" });
    }

    const localMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
    if (localMatch) {
      return new Date(Date.UTC(Number(localMatch[3]), Number(localMatch[2]) - 1, Number(localMatch[1])))
        .toLocaleDateString("es-AR", { timeZone: "UTC" });
    }
  }

  return String(fecha);
}