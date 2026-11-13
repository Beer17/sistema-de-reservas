'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { normalizeUsers, syncBookedFlags } from './booking';
import { fetchState, sendAction } from './api-client';

/**
 * ==========================================
 *  ZUSTAND STORE - Estado global
 * ==========================================
 *
 * Maneja:
 * - Autenticación de usuarios (contra `data/users.json`)
 * - Gestión de horarios (reservar, cancelar, reprogramar)
 * - Notificaciones a usuarios sin reserva
 * - Toasts
 * - Sincronización con el servidor de archivos JSON
 *
 * La fuente de verdad es la carpeta `data/` del servidor: este store es
 * una caché que se mantiene al día con `GET /api/state` (sondeo de 3 s)
 * y con las acciones que se envían por `POST /api/state`.
 *
 * La hidratación se hace de forma controlada desde <StoreHydration />
 * para evitar diferencias entre el HTML del servidor y el del cliente.
 */

export const STORAGE_KEY = 'sistema-reservas:v1';
const MAX_TOASTS = 4;
const POLL_INTERVAL = 3000;

let sequence = 0;
const uid = (prefix) => {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let pollingTimer = null;
let stopListeners = null;

/**
 * Vuelca un estado del servidor en el store.
 * La sesión se reconcilia: si el usuario ya no existe, se cierra.
 */
function applyState(set, get, state, { silent = false, userId = null } = {}) {
  if (!state || typeof state !== 'object') return false;

  const timeSlots = Array.isArray(state.timeSlots) ? state.timeSlots : [];
  const users = syncBookedFlags(normalizeUsers(state.users), timeSlots);
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];

  const wantedId = userId ?? get().currentUser?.id ?? null;
  const currentUser = wantedId
    ? users.find((user) => user.id === wantedId) || null
    : null;

  const previousRevision = get().lastRevision || 0;
  const hasChanges = (state.revision || 0) !== previousRevision;

  set({
    users,
    timeSlots,
    notifications,
    currentUser,
    isAuthenticated: Boolean(currentUser),
    lastRevision: state.revision || 0,
    lastSyncedAt: new Date().toISOString(),
    syncStatus: 'synced',
  });

  if (!silent && currentUser && hasChanges) {
    get().addToast({
      type: 'info',
      title: 'Sistema actualizado',
      message: 'Se actualizaron los datos guardados en los archivos JSON.',
    });
  }

  return true;
}

const useStore = create()(
  persist(
    (set, get) => ({
      // ===== Autenticación =====
      currentUser: null,
      users: [],
      isAuthenticated: false,

      // ===== Horarios =====
      timeSlots: [],

      // ===== Notificaciones y toasts =====
      notifications: [],
      toasts: [],

      // ===== Estado de sincronización con el servidor =====
      syncStatus: 'connecting',
      lastSyncedAt: null,
      lastRevision: 0,

      // ===== Autenticación =====

      /**
       * Inicia sesión contra los usuarios del archivo `data/users.json`.
       * Si el servidor no responde, se intenta con la caché local.
       */
      login: async (email, password) => {
        try {
          const data = await sendAction('login', { email, password });
          const state = await fetchState();

          applyState(set, get, state, { silent: true, userId: data.user.id });

          return { success: true, user: data.user };
        } catch (error) {
          // Si el servidor respondió con un error (credenciales incorrectas,
          // usuario borrado...) se muestra ese mensaje y no se fuerza el acceso.
          if (error?.status) {
            return {
              success: false,
              error:
                error?.message ||
                'Correo o contraseña incorrectos. Usa una cuenta de demostración.',
            };
          }

          // Servidor inaccesible: se valida contra la caché local.
          const users = normalizeUsers(get().users);
          const normalizedEmail = String(email || '').trim().toLowerCase();
          const normalizedPassword = String(password || '');

          const user = users.find(
            (candidate) =>
              String(candidate.email || '').toLowerCase() === normalizedEmail &&
              String(candidate.password || '') === normalizedPassword
          );

          if (user) {
            set({ users, currentUser: { ...user }, isAuthenticated: true });
            return { success: true, user };
          }

          return {
            success: false,
            error:
              error?.message ||
              'Correo o contraseña incorrectos. Usa una cuenta de demostración.',
          };
        }
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, toasts: [] });
      },

      /**
       * Cambia de usuario sin cerrar sesión.
       * Solo cambia la sesión local (no se comparte entre dispositivos).
       */
      switchUser: (userId) => {
        const users = normalizeUsers(get().users);
        const user = users.find((candidate) => candidate.id === userId);
        if (!user) return { success: false, error: 'Usuario no encontrado' };

        set({ currentUser: { ...user }, users, isAuthenticated: true });
        get().addToast({
          type: 'info',
          title: 'Sesión de demostración',
          message: `Ahora estás viendo el sistema como ${user.name}.`,
        });
        return { success: true };
      },

      // ===== Reservas =====

      /**
       * Reserva un horario. La validación final la hace el servidor
       * (que escribe en `data/time_slots.json`).
       */
      bookSlot: async (slotId) => {
        const { currentUser, timeSlots } = get();
        if (!currentUser) {
          return { success: false, error: 'Debes iniciar sesión para reservar.' };
        }

        const slot = timeSlots.find((item) => item.id === slotId);

        try {
          const data = await sendAction(
            'book',
            { slotId, version: slot?.version },
            currentUser.id
          );

          applyState(set, get, data.state, { silent: true });

          get().addToast({
            type: 'success',
            title: '¡Horario reservado!',
            message: data.message || 'Tu reserva quedó guardada.',
          });

          return { success: true };
        } catch (error) {
          if (error?.state) applyState(set, get, error.state, { silent: true });
          return { success: false, error: error?.message || 'No se pudo reservar.' };
        }
      },

      /**
       * Cancela una reserva.
       * - El dueño puede cancelar la suya.
       * - Un administrador puede liberar la reserva de cualquier usuario.
       */
      cancelSlot: async (slotId) => {
        const { currentUser } = get();

        if (!currentUser) {
          return { success: false, error: 'Debes iniciar sesión.' };
        }

        try {
          const data = await sendAction('cancel', { slotId }, currentUser.id);

          applyState(set, get, data.state, { silent: true });

          if (data.releasedFor) {
            get().addToast({
              type: 'info',
              title: 'Reserva liberada',
              message:
                data.message ||
                `Liberaste el horario de ${data.ownerName || 'un usuario'}. Se le avisó por notificación.`,
            });
          } else {
            get().addToast({
              type: 'info',
              title: 'Reserva cancelada',
              message: data.message || 'Tu horario quedó libre.',
            });
          }

          return {
            success: true,
            notified: data.notified || 0,
            releasedFor: data.releasedFor || null,
          };
        } catch (error) {
          if (error?.state) applyState(set, get, error.state, { silent: true });
          return { success: false, error: error?.message || 'No se pudo cancelar.' };
        }
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

      markAsRead: async (notificationId) => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          const data = await sendAction(
            'mark-read',
            { notificationId },
            currentUser.id
          );
          applyState(set, get, data.state, { silent: true });
        } catch {
          // Si falla, se deja la notificación como estaba.
        }
      },

      markAllAsRead: async () => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          const data = await sendAction('mark-all-read', {}, currentUser.id);
          applyState(set, get, data.state, { silent: true });
        } catch {
          // Si falla, se dejan las notificaciones como estaban.
        }
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

      resetDemo: async () => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'admin') {
          return {
            success: false,
            error: 'Solo un administrador puede reiniciar la demo.',
          };
        }

        try {
          const data = await sendAction('reset', {}, currentUser.id);
          applyState(set, get, data.state, { silent: true });

          get().addToast({
            type: 'info',
            title: 'Demo reiniciada',
            message: 'Los horarios y las notificaciones volvieron a su estado inicial.',
          });

          return { success: true };
        } catch (error) {
          if (error?.state) applyState(set, get, error.state, { silent: true });
          return { success: false, error: error?.message || 'No se pudo reiniciar.' };
        }
      },

      // ===== Sincronización con los archivos JSON =====

      /**
       * Descarga el estado del servidor y lo aplica.
       * @param {{silent?: boolean}} options
       */
      refresh: async ({ silent = false } = {}) => {
        try {
          const state = await fetchState();
          const changed = (state.revision || 0) !== get().lastRevision;

          applyState(set, get, state, { silent: silent || !changed });

          return { success: true, changed };
        } catch (error) {
          set({ syncStatus: 'error' });
          return { success: false, error: error?.message };
        }
      },

      /**
       * Sondeo periódico + refresco al volver a la pestaña.
       * Devuelve la función para detenerlo.
       */
      startSync: () => {
        if (typeof window === 'undefined') return () => {};

        stopSync();

        const tick = () => {
          if (document.visibilityState === 'visible') {
            get().refresh({ silent: true });
          }
        };

        pollingTimer = setInterval(tick, POLL_INTERVAL);
        document.addEventListener('visibilitychange', tick);
        window.addEventListener('focus', tick);

        stopListeners = () => {
          document.removeEventListener('visibilitychange', tick);
          window.removeEventListener('focus', tick);
        };

        return stopSync;
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
        lastRevision: state.lastRevision,
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
          lastRevision: persistedState.lastRevision || 0,
          toasts: [],
        };
      },
    }
  )
);

/** Detiene el sondeo en curso (lo llama <StoreHydration /> al desmontar). */
export function stopSync() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  if (stopListeners) {
    stopListeners();
    stopListeners = null;
  }
}

export default useStore;
