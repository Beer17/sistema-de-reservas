/**
 * ==========================================
 *  DATOS DEL PROTOTIPO (sin base de datos)
 * ==========================================
 *
 * Todo vive en el navegador (Zustand + localStorage).
 * Para cambiar la semana de entregas basta con editar WEEK_START_ISO.
 *
 * Estructura lógica (equivalente a tablas):
 *
 * users
 * ─────────────────────────────────────────
 * | id, name, email, password, avatar
 * | has_booked_slot, booked_slot_id
 *
 * time_slots
 * ─────────────────────────────────────────
 * | id, date, start_time, end_time
 * | is_available, booked_by, booked_by_name, version
 *
 * notifications
 * ─────────────────────────────────────────
 * | id, type, title, message, slot_id
 * | slot_date, slot_time, target_user_ids, read_by, created_at
 */

// Lunes de la semana de entregas (formato YYYY-MM-DD).
// Fecha fija para que el HTML del servidor y el del cliente coincidan.
export const WEEK_START_ISO = '2026-11-02';

// Cantidad de días hábiles de la semana (lunes a viernes).
export const WEEK_DAYS = 5;

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

const WEEKDAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const TIME_BLOCKS = [
  { start: '09:00', end: '09:30' },
  { start: '09:30', end: '10:00' },
  { start: '10:00', end: '10:30' },
  { start: '10:30', end: '11:00' },
  { start: '11:00', end: '11:30' },
  { start: '11:30', end: '12:00' },
  { start: '14:00', end: '14:30' },
  { start: '14:30', end: '15:00' },
  { start: '15:00', end: '15:30' },
  { start: '15:30', end: '16:00' },
];

// ===== Utilidades de fecha (siempre en UTC, sin depender del navegador) =====

function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ===== Semana de entregas =====

export const WEEK_DATES = Array.from({ length: WEEK_DAYS }, (_, index) => {
  const date = parseISODate(WEEK_START_ISO);
  date.setUTCDate(date.getUTCDate() + index);
  return toISODate(date);
});

/** Ej: { '2026-11-02': 'Lunes 2', ... } */
export const DAY_NAMES = Object.fromEntries(
  WEEK_DATES.map((iso) => {
    const date = parseISODate(iso);
    return [iso, `${WEEKDAYS_ES[date.getUTCDay()]} ${date.getUTCDate()}`];
  })
);

/** Ej: { '2026-11-02': 'Lun', ... } */
export const DAY_SHORT = Object.fromEntries(
  WEEK_DATES.map((iso) => {
    const date = parseISODate(iso);
    return [iso, WEEKDAYS_ES[date.getUTCDay()].slice(0, 3)];
  })
);

const firstDate = parseISODate(WEEK_DATES[0]);
const lastDate = parseISODate(WEEK_DATES[WEEK_DATES.length - 1]);

const firstMonth = MONTHS_ES[firstDate.getUTCMonth()];
const lastMonth = MONTHS_ES[lastDate.getUTCMonth()];

export const WEEK_LABEL =
  firstMonth === lastMonth
    ? `Semana de entregas: ${firstDate.getUTCDate()} – ${lastDate.getUTCDate()} de ${firstMonth}`
    : `Semana de entregas: ${firstDate.getUTCDate()} de ${firstMonth} – ${lastDate.getUTCDate()} de ${lastMonth}`;

export const MONTH_LABEL = `${capitalize(MONTHS_ES[lastDate.getUTCMonth()])} ${lastDate.getUTCFullYear()}`;

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

/** Ej: "2 – 6 Nov" (para tarjetas compactas) */
export const WEEK_SHORT = `${firstDate.getUTCDate()} – ${lastDate.getUTCDate()} ${
  SHORT_MONTHS_ES[lastDate.getUTCMonth()]
}`;

// ===== Usuarios de demostración =====

/**
 * Roles:
 * - `admin`: puede liberar horarios de cualquier alumno y reiniciar la demo.
 * - `user`: solo puede gestionar su propia reserva.
 */
export const DEMO_USERS = [
  {
    id: 'user-001',
    name: 'Abel García',
    email: 'abel@universidad.edu',
    password: '1234',
    avatar: 'AG',
    role: 'admin',
    has_booked_slot: false,
    booked_slot_id: null,
  },
  {
    id: 'user-002',
    name: 'María López',
    email: 'maria@universidad.edu',
    password: '1234',
    avatar: 'ML',
    role: 'user',
    has_booked_slot: false,
    booked_slot_id: null,
  },
  {
    id: 'user-003',
    name: 'Carlos Ruiz',
    email: 'carlos@universidad.edu',
    password: '1234',
    avatar: 'CR',
    role: 'user',
    has_booked_slot: false,
    booked_slot_id: null,
  },
  {
    id: 'user-004',
    name: 'Ana Torres',
    email: 'ana@universidad.edu',
    password: '1234',
    avatar: 'AT',
    role: 'user',
    has_booked_slot: false,
    booked_slot_id: null,
  },
  {
    id: 'user-005',
    name: 'Luis Mendoza',
    email: 'luis@universidad.edu',
    password: '1234',
    avatar: 'LM',
    role: 'user',
    has_booked_slot: false,
    booked_slot_id: null,
  },
];

// ===== Generación de bloques de horario =====

export function buildTimeSlots() {
  const slots = [];
  let slotIndex = 0;

  WEEK_DATES.forEach((date) => {
    TIME_BLOCKS.forEach((block) => {
      slotIndex += 1;
      slots.push({
        id: `slot-${String(slotIndex).padStart(3, '0')}`,
        date,
        start_time: block.start,
        end_time: block.end,
        is_available: true,
        booked_by: null,
        booked_by_name: null,
        version: 1,
        created_at: new Date().toISOString(),
      });
    });
  });

  return slots;
}

export const INITIAL_TIME_SLOTS = buildTimeSlots();

export const TOTAL_SLOTS = INITIAL_TIME_SLOTS.length;
export const SLOTS_PER_DAY = TIME_BLOCKS.length;

export const DEMO_PASSWORD = '1234';
