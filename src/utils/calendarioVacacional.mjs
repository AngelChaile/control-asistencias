// Calendario común de vacaciones para Morón.
// Ley 27.399: https://www.argentina.gob.ar/normativa/nacional/ley-27399-281835/texto
const FIJOS = {
  "01-01": "Año Nuevo",
  "03-24": "Día de la Memoria",
  "04-02": "Día de Malvinas",
  "05-01": "Día del Trabajador",
  "05-25": "Revolución de Mayo",
  "06-20": "Día de la Bandera",
  "07-09": "Día de la Independencia",
  "12-08": "Inmaculada Concepción",
  "12-25": "Navidad",
};

const TRASLADABLES = {
  "06-17": "Paso a la Inmortalidad de Güemes",
  "08-17": "Paso a la Inmortalidad de San Martín",
  "10-12": "Día del Respeto a la Diversidad Cultural",
  "11-20": "Día de la Soberanía Nacional",
};

// Agregar cada año los puentes al publicarse en el Boletín Oficial.
const PUENTES_PUBLICADOS = {
  2020: ["03-23", "07-10", "12-07"], // Decreto 717/2019
  2021: ["05-24", "10-08", "11-22"], // Decreto 947/2020
  2022: ["10-07", "11-21", "12-09"], // Decreto 789/2021
  2023: ["05-26", "06-19", "10-13"], // Decreto 764/2022
  2024: ["04-01", "06-21", "10-11"], // Decreto 106/2023
  2025: ["05-02", "08-15", "11-21"], // Decreto 1027/2024
  2026: ["03-23", "07-10", "12-07"], // Resolución 164/2025
};

const TRASLADOS_PUBLICADOS = {
  "2020-04-02": "2020-03-31", // Decreto 297/2020
  "2025-10-12": "2025-10-10", // Resolución 139/2025
};

const FECHAS_EXTRAORDINARIAS = {
  "2022-05-18": "Censo Nacional (Decreto 42/2022)",
  "2022-09-02": "Feriado nacional (Decreto 573/2022)",
  "2022-12-20": "Feriado nacional por el Mundial (Decreto 842/2022)",
  "2026-10-05": "Aniversario de Morón (Resolución PBA 467/2026)",
  "2026-11-09": "Feriado nacional por la visita papal (Decreto 1103/2026)",
  "2026-11-11": "Feriado en la provincia de Buenos Aires (Decreto 1103/2026)",
};

const A_LUNES = { 2: -1, 3: -2, 4: 4, 5: 3 };
const clave = fecha => fecha.toISOString().slice(0, 10);
function sumarDias(fecha, dias) {
  const resultado = new Date(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

// Computus gregoriano de Meeus, Jones y Butcher.
function domingoDePascua(anio) {
  const cicloLunar = anio % 19;
  const siglo = Math.floor(anio / 100);
  const anioDelSiglo = anio % 100;
  const bisiestosDelSiglo = Math.floor(siglo / 4);
  const correccionSolar = Math.floor((siglo + 8) / 25);
  const correccionLunar = Math.floor((siglo - correccionSolar + 1) / 3);
  const epacta = (19 * cicloLunar + siglo - bisiestosDelSiglo - correccionLunar + 15) % 30;
  const ajusteSemanal = (32 + 2 * (siglo % 4) + 2 * Math.floor(anioDelSiglo / 4) - epacta - (anioDelSiglo % 4)) % 7;
  const correccionFinal = Math.floor((cicloLunar + 11 * epacta + 22 * ajusteSemanal) / 451);
  const indice = epacta + ajusteSemanal - 7 * correccionFinal + 114;
  return new Date(Date.UTC(anio, Math.floor(indice / 31) - 1, (indice % 31) + 1));
}

export function calendarioVacacional(anio) {
  const fechas = new Map();
  const agregar = (fecha, motivo) => {
    const anterior = fechas.get(fecha);
    fechas.set(fecha, anterior ? `${anterior} · ${motivo}` : motivo);
  };
  const pascua = domingoDePascua(anio);
  for (const [dias, motivo] of [
    [-48, "Lunes de Carnaval"], [-47, "Martes de Carnaval"],
    [-3, "Jueves Santo"], [-2, "Viernes Santo"],
  ]) agregar(clave(sumarDias(pascua, dias)), motivo);

  for (const [mesDia, motivo] of Object.entries(FIJOS)) {
    const fecha = `${anio}-${mesDia}`;
    agregar(TRASLADOS_PUBLICADOS[fecha] || fecha, motivo);
  }
  for (const [mesDia, motivo] of Object.entries(TRASLADABLES)) {
    const original = `${anio}-${mesDia}`;
    const fecha = new Date(original);
    const lunes = clave(sumarDias(fecha, A_LUNES[fecha.getUTCDay()] || 0));
    // Si el traslado coincide con un feriado inamovible se conserva la fecha original (Decreto 789/2021).
    const traslado = FIJOS[lunes.slice(5)] ? original : lunes;
    agregar(TRASLADOS_PUBLICADOS[original] || traslado, motivo);
  }
  for (const mesDia of PUENTES_PUBLICADOS[anio] || []) {
    agregar(`${anio}-${mesDia}`, "Día turístico");
  }
  for (const [fecha, motivo] of Object.entries(FECHAS_EXTRAORDINARIAS)) {
    if (fecha.startsWith(`${anio}-`)) agregar(fecha, motivo);
  }
  return { fechas, puentesPublicados: Boolean(PUENTES_PUBLICADOS[anio]) };
}
