'use client';

import { create } from 'zustand';
import { DEMO_USERS, INITIAL_TIME_SLOTS } from './data';

/**
 * ==========================================
 *  ZUSTAND STORE - Estado Global
 * ==========================================
 * 
 * Maneja:
 * - Autenticación de usuarios
 * - Gestión de horarios (reservar, cancelar)
 * - Sistema de notificaciones en tiempo real
 * - Bloqueo optimista para concurrencia
 */

const useStore = create((set, get) => ({
  // ===== Estado de Autenticación =====
  currentUser: null,
  users: [...DEMO_USERS],
  isAuthenticated: false,

  // ===== Estado de Horarios =====
  timeSlots: [...INITIAL_TIME_SLOTS],

  // ===== Estado de Notificaciones =====
  notifications: [],
  toasts: [],

  // ===== Acciones de Autenticación =====
  login: (email, password) => {
    const { users } = get();
    const user = users.find(
      (u) => u.email === email && u.password === password
    );
    if (user) {
      set({ currentUser: user, isAuthenticated: true });
      return { success: true, user };
    }
    return { success: false, error: 'Credenciales inválidas' };
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },

  // ===== Acciones de Horarios =====

  /**
   * RESERVAR UN HORARIO
   * ─────────────────────────────────────────
   * 1. Verifica que el slot siga disponible (bloqueo optimista con versión)
   * 2. Marca el slot como reservado
   * 3. Actualiza el flag has_booked_slot del usuario
   * 4. Si el usuario tenía otro slot, lo libera primero
   */
  bookSlot: (slotId) => {
    const { currentUser, timeSlots, users } = get();
    if (!currentUser) return { success: false, error: 'No autenticado' };

    const slotIndex = timeSlots.findIndex((s) => s.id === slotId);
    if (slotIndex === -1) return { success: false, error: 'Slot no encontrado' };

    const slot = timeSlots[slotIndex];

    // Bloqueo optimista: verificar disponibilidad
    if (!slot.is_available) {
      return {
        success: false,
        error: 'Este horario ya fue reservado por otro alumno. Por favor, selecciona otro.',
      };
    }

    // Si el usuario ya tiene un slot, cancelar primero
    if (currentUser.has_booked_slot && currentUser.booked_slot_id) {
      const result = get().cancelSlot(currentUser.booked_slot_id, true);
      if (!result.success) return result;
    }

    // Actualizar slot
    const updatedSlots = [...timeSlots];
    updatedSlots[slotIndex] = {
      ...slot,
      is_available: false,
      booked_by: currentUser.id,
      booked_by_name: currentUser.name,
      version: slot.version + 1,
    };

    // Actualizar usuario
    const updatedUsers = users.map((u) =>
      u.id === currentUser.id
        ? { ...u, has_booked_slot: true, booked_slot_id: slotId }
        : u
    );

    const updatedCurrentUser = {
      ...currentUser,
      has_booked_slot: true,
      booked_slot_id: slotId,
    };

    set({
      timeSlots: updatedSlots,
      users: updatedUsers,
      currentUser: updatedCurrentUser,
    });

    // Agregar toast de confirmación
    get().addToast({
      type: 'success',
      title: '¡Horario reservado!',
      message: `Tu entrega está programada para el ${slot.date} a las ${slot.start_time}`,
    });

    return { success: true };
  },

  /**
   * CANCELAR UNA RESERVA (Lógica Principal)
   * ─────────────────────────────────────────
   * 1. Libera el slot (is_available = true)
   * 2. Actualiza el usuario (has_booked_slot = false)
   * 3. DISPARA NOTIFICACIÓN a usuarios sin horario asignado
   *    → Filtra por has_booked_slot === false
   *    → Excluye al usuario que cancela
   */
  cancelSlot: (slotId, isRebooking = false) => {
    const { currentUser, timeSlots, users, notifications } = get();
    if (!currentUser) return { success: false, error: 'No autenticado' };

    const slotIndex = timeSlots.findIndex((s) => s.id === slotId);
    if (slotIndex === -1) return { success: false, error: 'Slot no encontrado' };

    const slot = timeSlots[slotIndex];

    // Verificar que el usuario es quien reservó este slot
    if (slot.booked_by !== currentUser.id) {
      return { success: false, error: 'No puedes cancelar una reserva que no es tuya' };
    }

    // Liberar el slot
    const updatedSlots = [...timeSlots];
    updatedSlots[slotIndex] = {
      ...slot,
      is_available: true,
      booked_by: null,
      booked_by_name: null,
      version: slot.version + 1,
    };

    // Actualizar usuario que cancela
    const updatedUsers = users.map((u) =>
      u.id === currentUser.id
        ? { ...u, has_booked_slot: false, booked_slot_id: null }
        : u
    );

    const updatedCurrentUser = {
      ...currentUser,
      has_booked_slot: false,
      booked_slot_id: null,
    };

    // ===== SISTEMA DE NOTIFICACIONES =====
    // Encontrar usuarios que NO tienen horario asignado (excepto el actual)
    const targetUserIds = updatedUsers
      .filter((u) => !u.has_booked_slot && u.id !== currentUser.id)
      .map((u) => u.id);

    const dayNames = {
      '2026-10-26': 'Lunes 26',
      '2026-10-27': 'Martes 27',
      '2026-10-28': 'Miércoles 28',
      '2026-10-29': 'Jueves 29',
      '2026-10-30': 'Viernes 30',
    };

    const newNotification = {
      id: `notif-${Date.now()}`,
      type: 'slot_freed',
      message: `¡Nuevo espacio disponible! Se liberó el horario del ${dayNames[slot.date] || slot.date} de ${slot.start_time} a ${slot.end_time}.`,
      slot_id: slotId,
      slot_date: slot.date,
      slot_time: `${slot.start_time} - ${slot.end_time}`,
      target_user_ids: targetUserIds,
      read_by: [],
      created_at: new Date().toISOString(),
    };

    set({
      timeSlots: updatedSlots,
      users: updatedUsers,
      currentUser: updatedCurrentUser,
      notifications: [newNotification, ...notifications],
    });

    if (!isRebooking) {
      get().addToast({
        type: 'info',
        title: 'Reserva cancelada',
        message: 'Tu horario ha sido liberado. Los alumnos sin horario han sido notificados.',
      });
    }

    return { success: true };
  },

  // ===== Acciones de Notificaciones =====

  /**
   * Obtener notificaciones del usuario actual
   * Solo muestra las que están dirigidas a este usuario
   */
  getUserNotifications: () => {
    const { currentUser, notifications } = get();
    if (!currentUser) return [];
    return notifications.filter((n) =>
      n.target_user_ids.includes(currentUser.id)
    );
  },

  /**
   * Obtener conteo de notificaciones no leídas
   */
  getUnreadCount: () => {
    const { currentUser, notifications } = get();
    if (!currentUser) return 0;
    return notifications.filter(
      (n) =>
        n.target_user_ids.includes(currentUser.id) &&
        !n.read_by.includes(currentUser.id)
    ).length;
  },

  /**
   * Marcar notificación como leída
   */
  markAsRead: (notificationId) => {
    const { currentUser, notifications } = get();
    if (!currentUser) return;

    const updated = notifications.map((n) =>
      n.id === notificationId && !n.read_by.includes(currentUser.id)
        ? { ...n, read_by: [...n.read_by, currentUser.id] }
        : n
    );
    set({ notifications: updated });
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead: () => {
    const { currentUser, notifications } = get();
    if (!currentUser) return;

    const updated = notifications.map((n) =>
      n.target_user_ids.includes(currentUser.id) &&
      !n.read_by.includes(currentUser.id)
        ? { ...n, read_by: [...n.read_by, currentUser.id] }
        : n
    );
    set({ notifications: updated });
  },

  // ===== Toasts =====
  addToast: (toast) => {
    const id = `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },

  removeToast: (toastId) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== toastId),
    }));
  },

  // ===== Helpers =====
  getMySlot: () => {
    const { currentUser, timeSlots } = get();
    if (!currentUser || !currentUser.booked_slot_id) return null;
    return timeSlots.find((s) => s.id === currentUser.booked_slot_id);
  },

  getSlotsByDate: (date) => {
    const { timeSlots } = get();
    return timeSlots.filter((s) => s.date === date);
  },
}));

export default useStore;
