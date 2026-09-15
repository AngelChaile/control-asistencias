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



export function formatearHora24(hora) {
  if (!hora) return '';

  // Firestore Timestamp y Date deben conservar la hora local del registro.
  if (hora?.toDate) return formatearHora24(hora.toDate());
  if (hora instanceof Date) {
    if (Number.isNaN(hora.getTime())) return '';
    return `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
  }

  // Excel representa horas como una fracción del día (por ejemplo, 0.5 = 12:00).
  if (typeof hora === 'number' || /^\d+(\.\d+)?$/.test(String(hora).trim())) {
    const valor = Number(hora);
    if (valor >= 0 && valor < 1) {
      const minutosTotales = Math.round(valor * 24 * 60) % (24 * 60);
      return `${String(Math.floor(minutosTotales / 60)).padStart(2, '0')}:${String(minutosTotales % 60).padStart(2, '0')}`;
    }
  }
  
  // Si ya viene en formato 24hs (HH:mm), devolverlo tal cual
  const horaString = String(hora).trim();
  
  // Detectar si ya está en formato 24hs (ej: "08:00" o "14:30")
  const formato24 = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (formato24.test(horaString)) {
    // Asegurar que tenga dos dígitos en la hora
    const [h, m] = horaString.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  
  // Detectar formato AM/PM (ej: "08:00 AM", "2:30 PM")
  const formato12 = /^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i;
  const match = horaString.match(formato12);
  
  if (match) {
    let horas = parseInt(match[1], 10);
    const minutos = match[2];
    const periodo = (match[3] || '').toUpperCase();
    
    // Convertir a 24hs si tiene AM/PM
    if (periodo === 'PM' && horas < 12) {
      horas += 12;
    } else if (periodo === 'AM' && horas === 12) {
      horas = 0;
    }
    
    return `${String(horas).padStart(2, '0')}:${minutos}`;
  }
  
  // Si no coincide con ningún formato, devolver el valor original
  return horaString;
}