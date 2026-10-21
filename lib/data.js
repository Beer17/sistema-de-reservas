/**
 * ==========================================
 *  ESTRUCTURA DE DATOS - Modelos/Tablas
 * ==========================================
 * 
 * Tabla: users
 * ─────────────────────────────────────────
 * | Campo            | Tipo     | Descripción                          |
 * |------------------|----------|--------------------------------------|
 * | id               | string   | UUID único del usuario               |
 * | name             | string   | Nombre completo                      |
 * | email            | string   | Correo electrónico (login)           |
 * | password         | string   | Hash de la contraseña                |
 * | avatar           | string   | URL del avatar / iniciales           |
 * | has_booked_slot  | boolean  | TRUE si tiene horario asignado       |
 * | booked_slot_id   | string?  | ID del slot reservado (nullable)     |
 * | created_at       | datetime | Fecha de creación                    |
 * 
 * Tabla: time_slots
 * ─────────────────────────────────────────
 * | Campo            | Tipo     | Descripción                          |
 * |------------------|----------|--------------------------------------|
 * | id               | string   | UUID único del slot                  |
 * | date             | string   | Fecha (YYYY-MM-DD)                   |
 * | start_time       | string   | Hora de inicio (HH:mm)              |
 * | end_time         | string   | Hora de fin (HH:mm)                 |
 * | is_available     | boolean  | TRUE si está disponible              |
 * | booked_by        | string?  | ID del usuario que reservó (null)    |
 * | booked_by_name   | string?  | Nombre del usuario que reservó       |
 * | version          | number   | Para bloqueo optimista               |
 * | created_at       | datetime | Fecha de creación                    |
 * 
 * Tabla: notifications
 * ─────────────────────────────────────────
 * | Campo            | Tipo     | Descripción                          |
 * |------------------|----------|--------------------------------------|
 * | id               | string   | UUID único de la notificación        |
 * | type             | string   | 'slot_freed' | 'booking_confirmed'   |
 * | message          | string   | Mensaje de la notificación           |
 * | slot_id          | string   | ID del slot relacionado              |
 * | slot_date        | string   | Fecha del slot liberado              |
 * | slot_time        | string   | Hora del slot liberado               |
 * | target_user_ids  | string[] | IDs de usuarios que deben recibirla  |
 * | read_by          | string[] | IDs de usuarios que la leyeron       |
 * | created_at       | datetime | Fecha de creación                    |
 */

// ===== Usuarios de demostración =====
export const DEMO_USERS = [
  {
    id: 'user-001',
    name: 'Abel García',
    email: 'abel@universidad.edu',
    password: '1234',
    avatar: 'AG',
    has_booked_slot: false,
    booked_slot_id: null,
  },
  {
    id: 'user-002',
    name: 'María López',
    email: 'maria@universidad.edu',
    password: '1234',
    avatar: 'ML',
    has_booked_slot: false,
    booked_slot_id: null,
  },
  {
    id: 'user-003',
    name: 'Carlos Ruiz',
    email: 'carlos@universidad.edu',
    password: '1234',
    avatar: 'CR',
    has_booked_slot: false,
    booked_slot_id: null,
  },
  {
    id: 'user-004',
    name: 'Ana Torres',
    email: 'ana@universidad.edu',
    password: '1234',
    avatar: 'AT',
    has_booked_slot: false,
    booked_slot_id: null,
  },
  {
    id: 'user-005',
    name: 'Luis Mendoza',
    email: 'luis@universidad.edu',
    password: '1234',
    avatar: 'LM',
    has_booked_slot: false,
    booked_slot_id: null,
  },
];

// ===== Generar bloques de horarios =====
function generateTimeSlots() {
  const slots = [];
  // Generar slots para la semana del 26-30 de Octubre 2026 (Lun-Vie)
  const dates = [
    '2026-10-26', // Lunes
    '2026-10-27', // Martes
    '2026-10-28', // Miércoles
    '2026-10-29', // Jueves
    '2026-10-30', // Viernes
  ];

  const timeBlocks = [
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

  let slotIndex = 0;
  dates.forEach((date) => {
    timeBlocks.forEach((block) => {
      slotIndex++;
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

export const INITIAL_TIME_SLOTS = generateTimeSlots();

// ===== Helpers =====
export const DAY_NAMES = {
  '2026-10-26': 'Lunes',
  '2026-10-27': 'Martes',
  '2026-10-28': 'Miércoles',
  '2026-10-29': 'Jueves',
  '2026-10-30': 'Viernes',
};

export const MONTH_LABEL = 'Octubre 2026';
export const WEEK_LABEL = 'Semana de Entregas: 26 - 30 de Octubre';
