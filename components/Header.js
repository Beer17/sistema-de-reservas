'use client';

import { useEffect, useRef, useState } from 'react';
import useStore from '@/lib/store';
import NotificationPanel from './NotificationPanel';

export default function Header() {
  const currentUser = useStore((state) => state.currentUser);
  const users = useStore((state) => state.users);
  const switchUser = useStore((state) => state.switchUser);
  const resetDemo = useStore((state) => state.resetDemo);
  const logout = useStore((state) => state.logout);
  const addToast = useStore((state) => state.addToast);
  const syncStatus = useStore((state) => state.syncStatus);
  const lastSyncedAt = useStore((state) => state.lastSyncedAt);
  const storageLabel = useStore((state) => state.storageLabel);

  const isAdmin = currentUser?.role === 'admin';

  const syncLabel =
    syncStatus === 'synced'
      ? 'Guardado en JSON'
      : syncStatus === 'connecting'
        ? 'Conectando…'
        : syncStatus === 'error'
          ? 'Sin conexión con el servidor'
          : 'Conectando…';

  const syncDot =
    syncStatus === 'synced'
      ? 'bg-accent-500'
      : syncStatus === 'connecting'
        ? 'bg-warning-400 animate-pulse'
        : syncStatus === 'error'
          ? 'bg-danger-400'
          : 'bg-surface-200/30';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Cerrar menú al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  if (!currentUser) return null;

  const handleReset = () => {
    const confirmed = window.confirm(
      '¿Reiniciar la demo? Se borrarán las reservas y las notificaciones guardadas en los archivos JSON.'
    );
    if (confirmed) {
      setMenuOpen(false);
      resetDemo().then((result) => {
        if (!result.success) {
          addToast({
            type: 'error',
            title: 'Acción no permitida',
            message: result.error || 'Solo un administrador puede reiniciar la demo.',
          });
        }
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 glass-card border-b border-surface-200/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-bold gradient-text leading-tight">Sistema de Reservas</p>
              <p className="text-xs text-surface-200/30 leading-tight">Reserva de horarios</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <span
              className="hidden md:inline-flex items-center gap-1.5 mr-1 px-2.5 py-1 rounded-lg bg-surface-800/50 border border-surface-200/10 text-[0.7rem] text-surface-200/50"
              title={
                lastSyncedAt
                  ? `Última sincronización: ${new Date(lastSyncedAt).toLocaleTimeString('es')}${
                      storageLabel ? `\nGuardado en: ${storageLabel}` : ''
                    }`
                  : 'Estado de sincronización'
              }
            >
              <span className={`w-2 h-2 rounded-full ${syncDot}`} aria-hidden="true" />
              {syncLabel}
            </span>
            <NotificationPanel />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Menú de usuario"
                className="flex items-center gap-2 ml-0.5 sm:ml-2 pl-1.5 sm:pl-3 sm:border-l sm:border-surface-200/10 rounded-xl hover:bg-surface-700/40 transition-colors p-1.5 pr-2"
              >
                <span className="hidden md:block text-right max-w-[9rem]">
                  <span className="block text-sm font-medium text-white leading-tight truncate">
                    {currentUser.name}
                  </span>
                  <span className="block text-xs text-surface-200/40 leading-tight truncate">
                    {isAdmin
                      ? 'Administrador'
                      : (() => {
                          const count = Array.isArray(currentUser.booked_slot_ids)
                            ? currentUser.booked_slot_ids.length
                            : currentUser.has_booked_slot
                              ? 1
                              : 0;
                          return count === 0
                            ? 'Sin reserva'
                            : count === 1
                              ? 'Con reserva'
                              : `${count} reservas`;
                        })()}
                  </span>
                </span>
                <span className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-md shadow-primary-500/20">
                  {currentUser.avatar}
                </span>
                <svg
                  className={`w-4 h-4 text-surface-200/40 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Menú de usuario"
                  className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] glass-card rounded-2xl overflow-hidden shadow-2xl shadow-black/50 animate-fade-in-down z-50"
                >
                  {/* Usuario actual */}
                  <div className="p-4 border-b border-surface-200/10">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
                        {currentUser.avatar}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
                          {isAdmin && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-primary-500/20 border border-primary-500/30 text-[0.6rem] font-bold uppercase tracking-wider text-primary-300">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-200/40 truncate">{currentUser.email}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        currentUser.has_booked_slot
                          ? 'bg-primary-500/15 text-primary-300'
                          : 'bg-surface-700/50 text-surface-200/50'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          currentUser.has_booked_slot ? 'bg-primary-400' : 'bg-surface-200/30'
                        }`}
                      />
                      {(() => {
                        const count = Array.isArray(currentUser.booked_slot_ids)
                          ? currentUser.booked_slot_ids.length
                          : currentUser.has_booked_slot
                            ? 1
                            : 0;
                        return count === 0
                          ? 'Sin reserva'
                          : count === 1
                            ? 'Reserva activa'
                            : `${count} reservas activas`;
                      })()}
                    </span>
                  </div>

                  {/* Cambio rápido de usuario */}
                  <div className="p-2 max-h-[42dvh] overflow-y-auto">
                    <p className="px-2 py-1.5 text-[0.65rem] uppercase tracking-wider text-surface-200/35 font-semibold">
                      Cambiar de usuario · demo
                    </p>
                    {users.map((user) => {
                      const isCurrent = user.id === currentUser.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            switchUser(user.id);
                            setMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-colors ${
                            isCurrent
                              ? 'bg-primary-500/15'
                              : 'hover:bg-surface-700/50'
                          }`}
                        >
                          <span className="w-8 h-8 shrink-0 rounded-full bg-primary-500/20 flex items-center justify-center text-[0.7rem] font-bold text-primary-300">
                            {user.avatar}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-white truncate leading-tight">
                              {user.name}
                            </span>
                            <span
                              className={`block text-[0.7rem] leading-tight truncate ${
                                user.role === 'admin'
                                  ? 'text-primary-300'
                                  : user.has_booked_slot
                                    ? 'text-accent-400'
                                    : 'text-surface-200/35'
                              }`}
                            >
                              {user.role === 'admin'
                                ? 'Administrador'
                                : (() => {
                                    const count = Array.isArray(user.booked_slot_ids)
                                      ? user.booked_slot_ids.length
                                      : user.has_booked_slot
                                        ? 1
                                        : 0;
                                    return count === 0
                                      ? 'Sin reserva'
                                      : count === 1
                                        ? 'Con reserva'
                                        : `${count} reservas`;
                                  })()}
                            </span>
                          </span>
                          {isCurrent && (
                            <svg className="w-4 h-4 text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Acciones */}
                  <div className="p-2 border-t border-surface-200/10">
                    {isAdmin && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleReset}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-surface-200/60 hover:text-warning-400 hover:bg-warning-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992V4.356m-4.992 4.992l3.181-3.183a8.25 8.25 0 00-13.803 3.7M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7" />
                        </svg>
                        Reiniciar demo
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-surface-200/60 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
