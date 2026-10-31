'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DAY_NAMES, DEMO_USERS, INITIAL_TIME_SLOTS } from './data';

/**
 * ==========================================
 *  ZUSTAND STORE - Estado global
 * ==========================================
 *
 * Maneja:
 * - Autenticación de usuarios
 * - Gestión de horarios (reservar, cancelar, reprogramar)
 * - Notificaciones a alumnos sin horario
 * - Toasts
 * - Persistencia en localStorage (no requiere base de datos)
 *
 * La hidratación se hace de forma controlada desde <StoreHydration />
 * para evitar diferencias entre el HTML del servidor y el del cliente.
 */

export const STORAGE_KEY = 'agenda-entregas:v1';
const MAX_NOTIFICATIONS = 40;
const MAX_TOASTS = 4;

let sequence = 0;
const uid = (prefix) => {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
};

const freshUsers = () => DEMO_USERS.map((user) => ({ ...user }));
const freshSlots = () => INITIAL_TIME_SLOTS.map((slot) => ({ ...slot }));

// Los roles viven en el código: así una sesión vieja en localStorage
// no puede convertir a un alumno en administrador (ni al revés).
const ROLE_BY_ID = new Map(DEMO_USERS.map((user) => [user.id, user.role]));

const normalizeUsers = (users) =>
  (Array.isArray(users) ? users : []).map((user) => ({
    ...user,
    role: ROLE_BY_ID.get(user.id) || user.role || 'user',
  }));

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const useStore = create()(
  persist(
    (set, get) => ({
      // ===== Autenticación =====
      currentUser: null,
      users: freshUsers(),
      isAuthenticated: false,

      // ===== Horarios =====
      timeSlots: freshSlots(),

      // ===== Notificaciones y toasts =====
      notifications: [],
      toasts: [],

      // ===== Autenticación =====
      login: (email, password) => {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedPassword = String(password || '');

        const users = normalizeUsers(get().users);
        const user = users.find(
          (candidate) =>
            candidate.email.toLowerCase() === normalizedEmail &&
            candidate.password === normalizedPassword
        );

        if (!user) {
          return {
            success: false,
            error: 'Correo o contraseña incorrectos. Usa una cuenta de demostración.',
          };
        }

        set({ currentUser: { ...user }, users, isAuthenticated: true });
        return { success: true, user };
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, toasts: [] });
      },

      /**
       * Cambia de alumno sin cerrar sesión.
       * Sirve para probar el flujo de notificaciones entre compañeros
       * (al no existir backend, una pestaña = un alumno).
       */
      switchUser: (userId) => {
        const users = normalizeUsers(get().users);
        const user = users.find((candidate) => candidate.id === userId);
        if (!user) return { success: false, error: 'Usuario no encontrado' };

        set({ currentUser: { ...user }, users, isAuthenticated: true });
        get().addToast({
          type: 'info',
          title: 'Sesión de demostración',
          message: `Ahora estás viendo la agenda como ${user.name}.`,
        });
        return { success: true };
      },

      // ===== Reservas =====

      /**
       * Reserva un horario.
       * - Comprueba disponibilidad (bloqueo optimista con `version`).
       * - Si el alumno ya tenía otro horario, lo libera y notifica.
       * - Máximo una reserva activa por alumno.
       */
      bookSlot: (slotId) => {
        const { currentUser } = get();
        if (!currentUser) {
          return { success: false, error: 'Debes iniciar sesión para reservar.' };
        }

        const slot = get().timeSlots.find((item) => item.id === slotId);
        if (!slot) {
          return { success: false, error: 'El horario ya no existe.' };
        }
        if (slot.booked_by === currentUser.id) {
          return { success: false, error: 'Ya tienes reservado ese horario.' };
        }
        if (!slot.is_available) {
          return {
            success: false,
            error: 'Ese horario acaba de ser reservado. Elige otro, por favor.',
          };
        }

        // Reprogramar: liberar (y notificar) la reserva anterior.
        if (currentUser.booked_slot_id) {
          const cancelResult = get().cancelSlot(currentUser.booked_slot_id, true);
          if (!cancelResult.success) return cancelResult;
        }

        // Leer el estado ya actualizado tras una posible cancelación.
        const state = get();
        const user = state.currentUser;
        if (!user) return { success: false, error: 'Debes iniciar sesión.' };

        const freshSlot = state.timeSlots.find((item) => item.id === slotId);
        if (!freshSlot || !freshSlot.is_available) {
          return { success: false, error: 'Ese horario ya no está disponible.' };
        }

        const updatedSlots = state.timeSlots.map((item) =>
          item.id === slotId
            ? {
                ...item,
                is_available: false,
                booked_by: user.id,
                booked_by_name: user.name,
                version: item.version + 1,
              }
            : item
        );

        const updatedUsers = state.users.map((candidate) =>
          candidate.id === user.id
            ? { ...candidate, has_booked_slot: true, booked_slot_id: slotId }
            : candidate
        );

        set({
          timeSlots: updatedSlots,
          users: updatedUsers,
          currentUser: { ...user, has_booked_slot: true, booked_slot_id: slotId },
        });

        const dayLabel = DAY_NAMES[freshSlot.date] || freshSlot.date;
        get().addToast({
          type: 'success',
          title: '¡Horario reservado!',
          message: `Tu entrega quedó para el ${dayLabel} de ${freshSlot.start_time} a ${freshSlot.end_time}.`,
        });

        return { success: true };
      },

      /**
       * Cancela una reserva.
       * - El dueño puede cancelar la suya.
       * - Un administrador puede liberar la reserva de cualquier alumno.
       * - Notifica al alumno afectado (si fue el admin) y a los alumnos sin horario.
       */
      cancelSlot: (slotId, isRebooking = false) => {
        const state = get();
        const { currentUser } = state;

        if (!currentUser) {
          return { success: false, error: 'Debes iniciar sesión.' };
        }

        const slot = state.timeSlots.find((item) => item.id === slotId);
        if (!slot) {
          return { success: false, error: 'El horario ya no existe.' };
        }
        if (!slot.booked_by) {
          return { success: false, error: 'Ese horario ya está libre.' };
        }

        const isOwner = slot.booked_by === currentUser.id;
        const isAdmin = currentUser.role === 'admin';
        const isAdminRelease = isAdmin && !isOwner;

        if (!isOwner && !isAdminRelease) {
          return {
            success: false,
            error: 'No puedes cancelar una reserva que no es tuya.',
          };
        }

        const ownerId = slot.booked_by;
        const owner = state.users.find((candidate) => candidate.id === ownerId) || null;

        const freeSlot = {
          ...slot,
          is_available: true,
          booked_by: null,
          booked_by_name: null,
          version: slot.version + 1,
        };

        const updatedSlots = state.timeSlots.map((item) =>
          item.id === slotId ? freeSlot : item
        );

        // El horario se libera para su dueño (sea quien sea que lo canceló).
        const updatedUsers = state.users.map((candidate) =>
          candidate.id === ownerId
            ? { ...candidate, has_booked_slot: false, booked_slot_id: null }
            : candidate
        );

        // Alumnos sin horario que deben recibir el aviso de horario libre.
        const targetUserIds = updatedUsers
          .filter(
            (candidate) =>
              !candidate.has_booked_slot &&
              candidate.id !== ownerId &&
              candidate.id !== currentUser.id
          )
          .map((candidate) => candidate.id);

        const dayLabel = DAY_NAMES[freeSlot.date] || freeSlot.date;
        const slotLabel = `${dayLabel} de ${freeSlot.start_time} a ${freeSlot.end_time}`;
        const newNotifications = [];

        // Aviso directo al alumno cuya reserva liberó el administrador.
        if (isAdminRelease) {
          newNotifications.push({
            id: uid('notif'),
            type: 'reservation_cancelled',
            title: 'Reserva liberada por administración',
            message: `El administrador liberó tu horario del ${slotLabel}. Si todavía lo necesitas, puedes volver a reservarlo.`,
            slot_id: freeSlot.id,
            slot_date: freeSlot.date,
            slot_time: `${freeSlot.start_time} - ${freeSlot.end_time}`,
            target_user_ids: [ownerId],
            read_by: [],
            created_at: new Date().toISOString(),
          });
        }

        if (targetUserIds.length > 0) {
          newNotifications.push({
            id: uid('notif'),
            type: 'slot_freed',
            title: 'Horario liberado',
            message: `Se liberó el ${slotLabel}. ¡Reserva antes de que lo haga otro compañero!`,
            slot_id: freeSlot.id,
            slot_date: freeSlot.date,
            slot_time: `${freeSlot.start_time} - ${freeSlot.end_time}`,
            target_user_ids: targetUserIds,
            read_by: [],
            created_at: new Date().toISOString(),
          });
        }

        set({
          timeSlots: updatedSlots,
          users: updatedUsers,
          currentUser: isOwner
            ? { ...currentUser, has_booked_slot: false, booked_slot_id: null }
            : currentUser,
          notifications: [...newNotifications, ...state.notifications].slice(
            0,
            MAX_NOTIFICATIONS
          ),
        });

        if (isAdminRelease) {
          get().addToast({
            type: 'info',
            title: 'Reserva liberada',
            message: `Liberaste el horario de ${owner?.name || 'un alumno'}. Se le avisó por notificación.`,
          });
        } else if (!isRebooking) {
          get().addToast({
            type: 'info',
            title: 'Reserva cancelada',
            message:
              targetUserIds.length > 0
                ? 'Tu horario quedó libre y avisamos a los compañeros sin horario.'
                : 'Tu horario quedó libre.',
          });
        }

        return {
          success: true,
          notified: targetUserIds.length,
          releasedFor: isAdminRelease ? ownerId : null,
        };
      },

      // ===== Notificaciones =====

      getUnreadCount: () => {
        const { currentUser, notifications } = get();
        if (!currentUser) return 0;
        return notifications.filter(
          (notification) =>
            notification.target_user_ids.includes(currentUser.id) &&
            !notification.read_by.includes(currentUser.id)
        ).length;
      },

      markAsRead: (notificationId) => {
        const { currentUser, notifications } = get();
        if (!currentUser) return;

        set({
          notifications: notifications.map((notification) =>
            notification.id === notificationId &&
            notification.target_user_ids.includes(currentUser.id) &&
            !notification.read_by.includes(currentUser.id)
              ? { ...notification, read_by: [...notification.read_by, currentUser.id] }
              : notification
          ),
        });
      },

      markAllAsRead: () => {
        const { currentUser, notifications } = get();
        if (!currentUser) return;

        set({
          notifications: notifications.map((notification) =>
            notification.target_user_ids.includes(currentUser.id) &&
            !notification.read_by.includes(currentUser.id)
              ? { ...notification, read_by: [...notification.read_by, currentUser.id] }
              : notification
          ),
        });
      },

      // ===== Toasts =====

      addToast: (toast) => {
        const id = uid('toast');
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }].slice(-MAX_TOASTS),
        }));

        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((item) => item.id !== id),
          }));
        }, 5000);
      },

      removeToast: (toastId) => {
        set((state) => ({
          toasts: state.toasts.filter((item) => item.id !== toastId),
        }));
      },

      // ===== Reinicio de la demo =====

      resetDemo: () => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'admin') {
          return {
            success: false,
            error: 'Solo un administrador puede reiniciar la demo.',
          };
        }

        const users = freshUsers();
        const nextUser = users.find((candidate) => candidate.id === currentUser.id) || null;

        set({
          users,
          timeSlots: freshSlots(),
          notifications: [],
          toasts: [],
          currentUser: nextUser,
          isAuthenticated: Boolean(nextUser),
        });

        if (nextUser) {
          get().addToast({
            type: 'info',
            title: 'Demo reiniciada',
            message: 'Los horarios y las notificaciones volvieron a su estado inicial.',
          });
        }

        return { success: true };
      },

      // ===== Helpers =====

      getMySlot: () => {
        const { currentUser, timeSlots } = get();
        if (!currentUser || !currentUser.booked_slot_id) return null;
        return timeSlots.find((slot) => slot.id === currentUser.booked_slot_id) || null;
      },

      getSlotsByDate: (date) => {
        return get().timeSlots.filter((slot) => slot.date === date);
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? noopStorage : window.localStorage
      ),
      skipHydration: true,
      partialize: (state) => ({
        currentUser: state.currentUser,
        users: state.users,
        isAuthenticated: state.isAuthenticated,
        timeSlots: state.timeSlots,
        notifications: state.notifications,
      }),
      // Reconciliamos la sesión con los datos persistidos.
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState;

        const users = normalizeUsers(
          Array.isArray(persistedState.users) && persistedState.users.length > 0
            ? persistedState.users
            : currentState.users
        );

        const persistedUser = persistedState.currentUser
          ? users.find((candidate) => candidate.id === persistedState.currentUser.id)
          : null;

        return {
          ...currentState,
          ...persistedState,
          users,
          currentUser: persistedUser ? { ...persistedUser } : null,
          isAuthenticated: Boolean(persistedUser),
          timeSlots:
            Array.isArray(persistedState.timeSlots) && persistedState.timeSlots.length > 0
              ? persistedState.timeSlots
              : currentState.timeSlots,
          notifications: Array.isArray(persistedState.notifications)
            ? persistedState.notifications
            : [],
          toasts: [],
        };
      },
    }
  )
);

export default useStore;
