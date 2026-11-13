'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useStore from '@/lib/store';

const SLOT_NOTICE_TYPES = new Set(['slot_freed', 'reservation_cancelled']);

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [bellAnimating, setBellAnimating] = useState(false);
  const [now, setNow] = useState(0);
  const panelRef = useRef(null);
  const prevUnreadRef = useRef(0);

  // Refresca los tiempos relativos mientras el panel está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const currentUser = useStore((state) => state.currentUser);
  const notifications = useStore((state) => state.notifications);
  const timeSlots = useStore((state) => state.timeSlots);
  const markAsRead = useStore((state) => state.markAsRead);
  const markAllAsRead = useStore((state) => state.markAllAsRead);
  const bookSlot = useStore((state) => state.bookSlot);
  const addToast = useStore((state) => state.addToast);

  // Solo las notificaciones dirigidas al usuario actual
  const myNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter((notification) =>
      notification.target_user_ids.includes(currentUser.id)
    );
  }, [notifications, currentUser]);

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return myNotifications.filter(
      (notification) => !notification.read_by.includes(currentUser.id)
    ).length;
  }, [myNotifications, currentUser]);

  // Animar la campana cuando llega una notificación nueva
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBellAnimating(true);
      const timer = setTimeout(() => setBellAnimating(false), 1000);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Cerrar al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleQuickBook = async (notification) => {
    const result = await bookSlot(notification.slot_id);
    if (result.success) {
      await markAsRead(notification.id);
      setIsOpen(false);
    } else {
      addToast({
        type: 'error',
        title: 'Horario no disponible',
        message: result.error || 'Ese horario ya fue ocupado por otro usuario.',
      });
    }
  };

  const timeAgo = (dateString) => {
    if (!now) return '';
    const timestamp = new Date(dateString).getTime();
    if (Number.isNaN(timestamp)) return '';

    const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
    if (diffSeconds < 60) return 'Ahora mismo';

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;

    return `Hace ${Math.floor(diffHours / 24)} d`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Campana */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
          setNow(Date.now());
        }}
        className="relative p-2 rounded-xl hover:bg-surface-700/50 transition-colors group"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : 'Notificaciones'
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <svg
          className={`w-[1.35rem] h-[1.35rem] sm:w-6 sm:h-6 text-surface-200/60 group-hover:text-white transition-colors ${
            bellAnimating ? 'animate-bell-ring' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-badge animate-scale-in" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="fixed left-3 right-3 top-[4.25rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 glass-card rounded-2xl overflow-hidden animate-fade-in-down z-50 shadow-2xl shadow-black/40 flex flex-col max-h-[70dvh] sm:max-h-[480px]"
        >
          {/* Cabecera */}
          <div className="p-4 border-b border-surface-200/10 flex items-center justify-between gap-3 shrink-0">
            <div>
              <h3 className="font-bold text-white text-sm">Notificaciones</h3>
              <p className="text-xs text-primary-400 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium shrink-0"
              >
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {myNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-700/50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-surface-200/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <p className="text-surface-200/40 text-sm">No tienes notificaciones</p>
                <p className="text-surface-200/25 text-xs mt-1">
                  Te avisaremos cuando se liberen horarios
                </p>
              </div>
            ) : (
              myNotifications.map((notification) => {
                const isRead = notification.read_by.includes(currentUser?.id);
                const relatedSlot = timeSlots.find(
                  (slot) => slot.id === notification.slot_id
                );
                const canBook = Boolean(relatedSlot?.is_available);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-surface-200/5 transition-colors hover:bg-surface-700/30 ${
                      !isRead ? 'bg-primary-500/5' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          SLOT_NOTICE_TYPES.has(notification.type)
                            ? 'bg-accent-500/15'
                            : 'bg-primary-500/15'
                        }`}
                      >
                        {SLOT_NOTICE_TYPES.has(notification.type) ? (
                          <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => !isRead && markAsRead(notification.id)}
                          className="block w-full text-left"
                        >
                          <p className={`text-sm leading-tight ${!isRead ? 'text-white font-semibold' : 'text-surface-200/80 font-medium'}`}>
                            {notification.title || 'Notificación'}
                          </p>
                          <p className={`text-xs leading-relaxed mt-1 ${!isRead ? 'text-surface-200/70' : 'text-surface-200/45'}`}>
                            {notification.message}
                          </p>
                        </button>

                        <div className="flex items-center justify-between gap-2 mt-2.5">
                          <span className="text-[0.7rem] text-surface-200/30">
                            {timeAgo(notification.created_at)}
                          </span>

                          {canBook && SLOT_NOTICE_TYPES.has(notification.type) && (
                            <button
                              type="button"
                              onClick={() => handleQuickBook(notification)}
                              className="text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1 bg-accent-500/10 px-2.5 py-1.5 rounded-lg hover:bg-accent-500/20"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Reservar
                            </button>
                          )}
                        </div>
                      </div>

                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-400 shrink-0 mt-2" aria-label="No leída" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
