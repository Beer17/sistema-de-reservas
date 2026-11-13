/**
 * ==========================================
 *  AGENDA (derivada de los horarios)
 * ==========================================
 *
 * Todos los datos vivos viven en los archivos JSON de `data/`.
 * Este módulo calcula, a partir de la lista de horarios, las etiquetas
 * que muestra la interfaz (días, semanas, meses...).
 *
 * Así, si editas `data/time_slots.json` a mano y añades un día nuevo,
 * la interfaz se adapta sola sin tocar código.
 *
 * No toca el sistema de archivos ni el navegador: es lógica pura.
 */

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const SHORT_MONTHS_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const WEEKDAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/** Convierte 'YYYY-MM-DD' en Date en UTC (sin desfases de zona horaria). */
export function parseISODate(iso) {
  const [year, month, day] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** 'Lunes 2' a partir de '2026-11-02'. */
export function formatDayLabel(iso) {
  if (!iso) return '';
  const date = parseISODate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${WEEKDAYS_ES[date.getUTCDay()]} ${date.getUTCDate()}`;
}

/** 'Lun' a partir de '2026-11-02'. */
export function formatDayShort(iso) {
  if (!iso) return '';
  const date = parseISODate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return WEEKDAYS_ES[date.getUTCDay()].slice(0, 3);
}

/**
 * Calcula los metadatos de la agenda a partir de los horarios.
 *
 * @param {Array<{date: string}>} timeSlots
 * @returns {{
 *   dates: string[],
 *   dayNames: Record<string, string>,
 *   dayShort: Record<string, string>,
 *   weekLabel: string,
 *   weekShort: string,
 *   monthLabel: string,
 *   slotsPerDay: number
 * }}
 */
export function buildScheduleMeta(timeSlots = []) {
  const slots = Array.isArray(timeSlots) ? timeSlots : [];
  const dates = [...new Set(slots.map((slot) => slot.date).filter(Boolean))].sort();

  const dayNames = {};
  const dayShort = {};
  dates.forEach((iso) => {
    dayNames[iso] = formatDayLabel(iso);
    dayShort[iso] = formatDayShort(iso);
  });

  const first = dates.length ? parseISODate(dates[0]) : null;
  const last = dates.length ? parseISODate(dates[dates.length - 1]) : null;

  let weekLabel = 'Periodo de reservas';
  let weekShort = '';
  let monthLabel = '';

  if (first && last) {
    const firstMonth = MONTHS_ES[first.getUTCMonth()];
    const lastMonth = MONTHS_ES[last.getUTCMonth()];

    weekLabel =
      firstMonth === lastMonth
        ? `Periodo de reservas: ${first.getUTCDate()} – ${last.getUTCDate()} de ${firstMonth}`
        : `Periodo de reservas: ${first.getUTCDate()} de ${firstMonth} – ${last.getUTCDate()} de ${lastMonth}`;

    weekShort = `${first.getUTCDate()} – ${last.getUTCDate()} ${SHORT_MONTHS_ES[last.getUTCMonth()]}`;
    monthLabel = `${capitalize(lastMonth)} ${last.getUTCFullYear()}`;
  }

  const slotsPerDay = dates.reduce((max, iso) => {
    const count = slots.filter((slot) => slot.date === iso).length;
    return count > max ? count : max;
  }, 0);

  return { dates, dayNames, dayShort, weekLabel, weekShort, monthLabel, slotsPerDay };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
