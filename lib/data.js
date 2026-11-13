/**
 * ==========================================
 *  CONFIGURACIÓN Y SEMILLA DE LA DEMO
 * ==========================================
 *
 * ⚠️ Este archivo ya NO es la base de datos.
 *
 * Los datos que usa la aplicación viven ahora en los archivos JSON de la
 * carpeta `data/` (ver `lib/json-store.js`):
 *
 *   data/users.json         → usuarios
 *   data/time_slots.json    → horarios y reservas
 *   data/notifications.json → notificaciones
 *
 * Este módulo solo define la **semilla** con la que se crean esos archivos
 * la primera vez (periodo, bloques de horario y cuentas de demostración)
 * y quelques constantes de configuración.
 *
 * Para cambiar el sistema en caliente, edita los JSON de `data/`:
 * la interfaz se adapta sola (días, horarios, usuarios y roles).
 */

// Lunes del periodo de reservas (formato YYYY-MM-DD).
// Fecha fija para que el HTML del servidor y el del cliente coincidan.
export const WEEK_START_ISO = '2026-11-02';

// Cantidad de días hábiles de la semana (lunes a viernes).
export const WEEK_DAYS = 5;

// Máximo de reservas activas simultáneas por usuario.
export const MAX_BOOKINGS_PER_USER = 10;

// Bloques de horario de cada día.
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

// ===== Usuarios de demostración (semilla de `data/users.json`) =====

/**
 * Roles:
 * - `admin`: puede liberar reservas de cualquier usuario y reiniciar la demo.
 * - `user`: solo puede gestionar su propia reserva.
 *
 * Estos usuarios se copian a `data/users.json` la primera vez. A partir de
 * ahí, los que mandan son los del archivo: edítalos a mano para añadir
 * cuentas, cambiar contraseñas o permisos.
 */
export const DEMO_USERS = [
  {
    id: 'user-001',
    name: 'Abel García',
    email: 'abel@empresa.com',
    password: '1234',
    avatar: 'AG',
    role: 'admin',
    has_booked_slot: false,
    booked_slot_id: null,
    booked_slot_ids: [],
  },
  {
    id: 'user-002',
    name: 'María López',
    email: 'maria@empresa.com',
    password: '1234',
    avatar: 'ML',
    role: 'user',
    has_booked_slot: false,
    booked_slot_id: null,
    booked_slot_ids: [],
  },
  {
    id: 'user-003',
    name: 'Carlos Ruiz',
    email: 'carlos@empresa.com',
    password: '1234',
    avatar: 'CR',
    role: 'user',
    has_booked_slot: false,
    booked_slot_id: null,
    booked_slot_ids: [],
  },
  {
    id: 'user-004',
    name: 'Ana Torres',
    email: 'ana@empresa.com',
    password: '1234',
    avatar: 'AT',
    role: 'user',
    has_booked_slot: false,
    booked_slot_id: null,
    booked_slot_ids: [],
  },
  {
    id: 'user-005',
    name: 'Luis Mendoza',
    email: 'luis@empresa.com',
    password: '1234',
    avatar: 'LM',
    role: 'user',
    has_booked_slot: false,
    booked_slot_id: null,
    booked_slot_ids: [],
  },
];

export const DEMO_PASSWORD = '1234';

// ===== Generación de bloques de horario (semilla de `data/time_slots.json`) =====

function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/** Fechas del periodo de reservas (lunes a viernes). */
export const WEEK_DATES = Array.from({ length: WEEK_DAYS }, (_, index) => {
  const date = parseISODate(WEEK_START_ISO);
  date.setUTCDate(date.getUTCDate() + index);
  return toISODate(date);
});

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
