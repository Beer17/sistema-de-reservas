/**
 * ==========================================
 *  LÓGICA DE NEGOCIO (compartida)
 * ==========================================
 *
 * Funciones puras que operan sobre el estado completo del sistema:
 *
 *   state = { users, timeSlots, notifications, updatedAt, revision }
 *
 * - El servidor (`lib/json-store.js` + `app/api/state/route.js`) las usa
 *   para validar cada operación y escribir los archivos JSON.
 * - El cliente (`lib/store.js`) las usa para mantener su copia local
 *   coherente y para pintar la interfaz.
 *
 * No toca el sistema de archivos: eso vive solo en `lib/json-store.js`.
 */

import { MAX_BOOKINGS_PER_USER } from './data';
import { formatDayLabel } from './schedule';

export const MAX_NOTIFICATIONS = 40;

/** Identificador único para notificaciones (servidor) o toasts (cliente). */
export function createId(prefix = 'id') {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2, 12);
  return `${prefix}-${random}`;
}

/**
 * Normaliza la lista de usuarios:
 * - el rol solo puede ser 'admin' o 'user';
 * - las reservas se derivan de `booked_slot_ids`.
 */
export function normalizeUsers(users) {
  return (Array.isArray(users) ? users : []).map((user) => {
    const ids = Array.isArray(user.booked_slot_ids)
      ? user.booked_slot_ids.filter(Boolean)
      : user.booked_slot_id
        ? [user.booked_slot_id]
        : [];

    return {
      ...user,
      role: user.role === 'admin' ? 'admin' : 'user',
      booked_slot_ids: ids,
      booked_slot_id: ids[0] || null,
      has_booked_slot: ids.length > 0,
    };
  });
}

/**
 * Recalcula las reservas de cada usuario a partir de los horarios.
 * Así los archivos `users.json` y `time_slots.json` nunca se contradicen:
 * la fuente de verdad de "quién tiene qué" es `time_slots.json`.
 */
export function syncBookedFlags(users, timeSlots) {
  const slots = Array.isArray(timeSlots) ? timeSlots : [];
  const list = Array.isArray(users) ? users : [];

  return normalizeUsers(
    list.map((user) => {
      const ids = slots
        .filter((slot) => slot.booked_by === user.id)
        .map((slot) => slot.id);

      return {
        ...user,
        booked_slot_ids: ids,
        booked_slot_id: ids[0] || null,
        has_booked_slot: ids.length > 0,
      };
    })
  );
}

/** Estado inicial (semilla) del sistema. */
export function createInitialState() {
  return {
    users: [],
    timeSlots: [],
    notifications: [],
    updatedAt: Date.now(),
    revision: 0,
  };
}

/** Comprueba las credenciales contra los usuarios del sistema. */
export function authenticate(state, { email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');

  const user = (state.users || []).find(
    (candidate) =>
      String(candidate.email || '').toLowerCase() === normalizedEmail &&
      String(candidate.password || '') === normalizedPassword
  );

  if (!user) {
    return {
      ok: false,
      error: 'Correo o contraseña incorrectos. Usa una cuenta de demostración.',
    };
  }

  return { ok: true, user };
}

/**
 * Reserva un horario.
 *
 * @param {object} state
 * @param {{userId: string, slotId: string, version?: number}} payload
 */
export function bookSlot(state, { userId, slotId, version } = {}) {
  const users = normalizeUsers(state.users);
  const slots = Array.isArray(state.timeSlots) ? state.timeSlots : [];

  const user = users.find((candidate) => candidate.id === userId);
  if (!user) {
    return { ok: false, status: 401, error: 'Debes iniciar sesión para reservar.' };
  }

  const slot = slots.find((item) => item.id === slotId);
  if (!slot) {
    return { ok: false, status: 404, error: 'El horario ya no existe.' };
  }

  if (slot.booked_by === userId) {
    return { ok: false, status: 409, error: 'Ya tienes reservado ese horario.' };
  }

  // Bloqueo optimista: si el horario cambió desde que el cliente lo vio,
  // alguien se ha adelantado. Se avisa para que recargue.
  if (typeof version === 'number' && version !== slot.version) {
    return {
      ok: false,
      status: 409,
      error: 'Ese horario acaba de ser reservado. Elige otro, por favor.',
    };
  }

  if (!slot.is_available) {
    return {
      ok: false,
      status: 409,
      error: 'Ese horario acaba de ser reservado. Elige otro, por favor.',
    };
  }

  const myCount = slots.filter((item) => item.booked_by === userId).length;
  if (myCount >= MAX_BOOKINGS_PER_USER) {
    return {
      ok: false,
      status: 409,
      error: `Ya tienes ${MAX_BOOKINGS_PER_USER} reservas activas. Cancela una para reservar otra.`,
    };
  }

  const nextSlots = slots.map((item) =>
    item.id === slotId
      ? {
          ...item,
          is_available: false,
          booked_by: userId,
          booked_by_name: user.name,
          version: (item.version || 0) + 1,
        }
      : item
  );

  const nextState = {
    ...state,
    users: syncBookedFlags(users, nextSlots),
    timeSlots: nextSlots,
    updatedAt: Date.now(),
  };

  const dayLabel = formatDayLabel(slot.date) || slot.date;

  return {
    ok: true,
    state: nextState,
    message: `Tu reserva quedó para el ${dayLabel} de ${slot.start_time} a ${slot.end_time}.`,
  };
}

/**
 * Cancela una reserva (o la libera el administrador).
 */
export function cancelSlot(state, { userId, slotId } = {}) {
  const users = normalizeUsers(state.users);
  const slots = Array.isArray(state.timeSlots) ? state.timeSlots : [];
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];

  const currentUser = users.find((candidate) => candidate.id === userId);
  if (!currentUser) {
    return { ok: false, status: 401, error: 'Debes iniciar sesión.' };
  }

  const slot = slots.find((item) => item.id === slotId);
  if (!slot) {
    return { ok: false, status: 404, error: 'El horario ya no existe.' };
  }
  if (!slot.booked_by) {
    return { ok: false, status: 409, error: 'Ese horario ya está libre.' };
  }

  const isOwner = slot.booked_by === currentUser.id;
  const isAdminRelease = currentUser.role === 'admin' && !isOwner;

  if (!isOwner && !isAdminRelease) {
    return {
      ok: false,
      status: 403,
      error: 'No puedes cancelar una reserva que no es tuya.',
    };
  }

  const ownerId = slot.booked_by;
  const owner = users.find((candidate) => candidate.id === ownerId) || null;

  const nextSlots = slots.map((item) =>
    item.id === slotId
      ? {
          ...item,
          is_available: true,
          booked_by: null,
          booked_by_name: null,
          version: (item.version || 0) + 1,
        }
      : item
  );

  const nextUsers = syncBookedFlags(users, nextSlots);

  // Usuarios sin reserva que deben recibir el aviso de horario libre.
  const targetUserIds = nextUsers
    .filter(
      (candidate) =>
        !candidate.has_booked_slot &&
        candidate.id !== ownerId &&
        candidate.id !== currentUser.id
    )
    .map((candidate) => candidate.id);

  const dayLabel = formatDayLabel(slot.date) || slot.date;
  const slotLabel = `${dayLabel} de ${slot.start_time} a ${slot.end_time}`;
  const createdAt = new Date().toISOString();
  const newNotifications = [];

  // Aviso directo al usuario cuya reserva liberó el administrador.
  if (isAdminRelease) {
    newNotifications.push({
      id: createId('notif'),
      type: 'reservation_cancelled',
      title: 'Reserva liberada por administración',
      message: `El administrador liberó tu horario del ${slotLabel}. Si todavía lo necesitas, puedes volver a reservarlo.`,
      slot_id: slot.id,
      slot_date: slot.date,
      slot_time: `${slot.start_time} - ${slot.end_time}`,
      target_user_ids: [ownerId],
      read_by: [],
      created_at: createdAt,
    });
  }

  if (targetUserIds.length > 0) {
    newNotifications.push({
      id: createId('notif'),
      type: 'slot_freed',
      title: 'Horario liberado',
      message: `Se liberó el ${slotLabel}. ¡Reserva antes de que lo haga otro usuario!`,
      slot_id: slot.id,
      slot_date: slot.date,
      slot_time: `${slot.start_time} - ${slot.end_time}`,
      target_user_ids: targetUserIds,
      read_by: [],
      created_at: createdAt,
    });
  }

  const nextState = {
    ...state,
    users: nextUsers,
    timeSlots: nextSlots,
    notifications: [...newNotifications, ...notifications].slice(0, MAX_NOTIFICATIONS),
    updatedAt: Date.now(),
  };

  return {
    ok: true,
    state: nextState,
    notified: targetUserIds.length,
    releasedFor: isAdminRelease ? ownerId : null,
    ownerName: owner?.name || null,
    message: isAdminRelease
      ? `Liberaste el horario de ${owner?.name || 'un usuario'}. Se le avisó por notificación.`
      : targetUserIds.length > 0
        ? 'Tu horario quedó libre y avisamos a los usuarios sin reserva.'
        : 'Tu horario quedó libre.',
  };
}

/** Marca una notificación como leída. */
export function markAsRead(state, { userId, notificationId } = {}) {
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];
  const exists = notifications.some((notification) => notification.id === notificationId);
  if (!exists) {
    return { ok: false, status: 404, error: 'La notificación ya no existe.' };
  }

  const nextNotifications = notifications.map((notification) =>
    notification.id === notificationId &&
    notification.target_user_ids.includes(userId) &&
    !notification.read_by.includes(userId)
      ? { ...notification, read_by: [...notification.read_by, userId] }
      : notification
  );

  return {
    ok: true,
    state: { ...state, notifications: nextNotifications, updatedAt: Date.now() },
  };
}

/** Marca todas las notificaciones del usuario como leídas. */
export function markAllAsRead(state, { userId } = {}) {
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];

  const nextNotifications = notifications.map((notification) =>
    notification.target_user_ids.includes(userId) &&
    !notification.read_by.includes(userId)
      ? { ...notification, read_by: [...notification.read_by, userId] }
      : notification
  );

  return {
    ok: true,
    state: { ...state, notifications: nextNotifications, updatedAt: Date.now() },
  };
}

/**
 * Reinicia la demo: vuelve al estado inicial (solo admin).
 * `seed` es el estado con el que se sembraron los archivos JSON.
 */
export function resetDemo(state, { userId, seed } = {}) {
  const users = normalizeUsers(state.users);
  const currentUser = users.find((candidate) => candidate.id === userId);

  if (!currentUser || currentUser.role !== 'admin') {
    return {
      ok: false,
      status: 403,
      error: 'Solo un administrador puede reiniciar la demo.',
    };
  }

  const base = seed || { users: [], timeSlots: [], notifications: [] };

  return {
    ok: true,
    state: {
      users: normalizeUsers(base.users),
      timeSlots: (base.timeSlots || []).map((slot) => ({ ...slot })),
      notifications: [],
      revision: state.revision || 0,
      updatedAt: Date.now(),
    },
  };
}
