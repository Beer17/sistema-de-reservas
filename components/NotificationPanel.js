'use client';

import { useState, useEffect, useRef } from 'react';
import useStore from '@/lib/store';

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const currentUser = useStore((s) => s.currentUser);
  const getUserNotifications = useStore((s) => s.getUserNotifications);
  const getUnreadCount = useStore((s) => s.getUnreadCount);
  const markAsRead = useStore((s) => s.markAsRead);
  const markAllAsRead = useStore((s) => s.markAllAsRead);
  const bookSlot = useStore((s) => s.bookSlot);

  const notifications = getUserNotifications();
  const unreadCount = getUnreadCount();

  const [bellAnimating, setBellAnimating] = useState(false);
  const prevUnreadRef = useRef(unreadCount);

  // Animar campana cuando llega nueva notificación
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBellAnimating(true);
      const timer = setTimeout(() => setBellAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Cerrar panel al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickBook = (slotId) => {
    const result = bookSlot(slotId);
    if (result.success) {
      setIsOpen(false);
    }
  };

  const timeAgo = (dateStr) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHour < 24) return `Hace ${diffHour}h`;
    return `Hace ${Math.floor(diffHour / 24)}d`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-surface-700/50 transition-all duration-200 group"
        aria-label="Notificaciones"
      >
        <svg
          className={`w-6 h-6 text-surface-200/60 group-hover:text-white transition-colors ${bellAnimating ? 'animate-bell-ring' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-badge animate-scale-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] glass-card rounded-2xl overflow-hidden animate-fade-in-down z-50 shadow-2xl shadow-black/40">
          {/* Header del panel */}
          <div className="p-4 border-b border-surface-200/10 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Notificaciones</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-primary-400 mt-0.5">
                  {unreadCount} sin leer
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto max-h-[380px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-700/50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-surface-200/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <p className="text-surface-200/40 text-sm">No tienes notificaciones</p>
                <p className="text-surface-200/25 text-xs mt-1">
                  Te notificaremos cuando se liberen horarios
                </p>
              </div>
            ) : (
              notifications.map((notif, i) => {
                const isRead = notif.read_by.includes(currentUser?.id);
                const timeSlots = useStore.getState().timeSlots;
                const relatedSlot = timeSlots.find((s) => s.id === notif.slot_id);
                const canBook = relatedSlot?.is_available && !currentUser?.has_booked_slot;

                return (
                  <div
                    key={notif.id}
                    className={`
                      p-4 border-b border-surface-200/5 transition-all duration-200
                      hover:bg-surface-700/30
                      ${!isRead ? 'bg-primary-500/5' : ''}
                    `}
                    onClick={() => !isRead && markAsRead(notif.id)}
                  >
                    <div className="flex gap-3">
                      {/* Icono */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${notif.type === 'slot_freed'
                          ? 'bg-accent-500/15'
                          : 'bg-primary-500/15'
                        }
                      `}>
                        {notif.type === 'slot_freed' ? (
                          <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${!isRead ? 'text-white font-medium' : 'text-surface-200/70'}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-surface-200/30">
                            {timeAgo(notif.created_at)}
                          </span>

                          {/* Botón rápido de reservar */}
                          {canBook && notif.type === 'slot_freed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickBook(notif.slot_id);
                              }}
                              className="text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1 bg-accent-500/10 px-2.5 py-1 rounded-lg hover:bg-accent-500/20"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Reservar ahora
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Indicador de no leída */}
                      {!isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary-400 shrink-0 mt-2" />
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
