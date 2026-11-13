'use client';

import { useEffect, useMemo, useState } from 'react';
import useStore from '@/lib/store';
import { MAX_BOOKINGS_PER_USER } from '@/lib/data';
import { buildScheduleMeta } from '@/lib/schedule';

export default function ScheduleGrid() {
  const timeSlots = useStore((state) => state.timeSlots);
  const currentUser = useStore((state) => state.currentUser);
  const bookSlot = useStore((state) => state.bookSlot);
  const cancelSlot = useStore((state) => state.cancelSlot);
  const addToast = useStore((state) => state.addToast);

  // La agenda se deriva de los horarios guardados en `data/time_slots.json`.
  const { dates, dayNames, weekLabel, slotsPerDay } = useMemo(
    () => buildScheduleMeta(timeSlots),
    [timeSlots]
  );

  const [selectedDate, setSelectedDate] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [releaseModal, setReleaseModal] = useState(null);

  // Si el servidor cambia los días disponibles, se muestra el primero.
  const activeDate =
    selectedDate && dates.includes(selectedDate) ? selectedDate : dates[0] ?? null;

  const isAdmin = currentUser?.role === 'admin';

  const mySlots = useMemo(() => {
    if (!currentUser) return [];
    return timeSlots
      .filter((slot) => slot.booked_by === currentUser.id)
      .sort((a, b) =>
        `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)
      );
  }, [currentUser, timeSlots]);

  const filteredSlots = timeSlots.filter((slot) => slot.date === activeDate);

  const stats = useMemo(() => {
    const total = timeSlots.length;
    const available = timeSlots.filter((slot) => slot.is_available).length;
    return { total, available, booked: total - available };
  }, [timeSlots]);

  // Cerrar modales con Escape
  useEffect(() => {
    if (!confirmModal && !cancelModal && !releaseModal) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setConfirmModal(null);
        setCancelModal(null);
        setReleaseModal(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal, cancelModal, releaseModal]);

  const confirmBooking = async () => {
    if (!confirmModal) return;
    const result = await bookSlot(confirmModal.id);
    setConfirmModal(null);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'No se pudo reservar',
        message: result.error || 'Ese horario ya no está disponible.',
      });
    }
  };

  const confirmCancel = async () => {
    if (!cancelModal) return;
    const result = await cancelSlot(cancelModal.id);
    setCancelModal(null);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'No se pudo cancelar',
        message: result.error || 'Inténtalo de nuevo.',
      });
    }
  };

  const confirmRelease = async () => {
    if (!releaseModal) return;
    const result = await cancelSlot(releaseModal.id);
    setReleaseModal(null);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'No se pudo liberar',
        message: result.error || 'Inténtalo de nuevo.',
      });
    }
  };

  const getSlotStatus = (slot) => {
    if (!currentUser) return 'booked';
    if (slot.booked_by === currentUser.id) return 'mine';
    if (!slot.is_available) return 'booked';
    return 'available';
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Título y estadísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Horarios disponibles
          </h2>
          <p className="text-surface-200/50 text-xs sm:text-sm">{weekLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-500" aria-hidden="true" />
            <span className="text-xs sm:text-sm text-surface-200/70">
              <span className="font-semibold text-accent-400">{stats.available}</span> libres
            </span>
          </div>
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-danger-400" aria-hidden="true" />
            <span className="text-xs sm:text-sm text-surface-200/70">
              <span className="font-semibold text-danger-400">{stats.booked}</span> reservados
            </span>
          </div>
        </div>
      </div>

      {/* Mis reservas activas */}
      {mySlots.length > 0 && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-primary-500 animate-fade-in-up">
          <p className="text-[0.7rem] sm:text-xs text-surface-200/50 uppercase tracking-wider font-medium mb-3">
            Tus reservas ({mySlots.length}/{MAX_BOOKINGS_PER_USER})
          </p>
          <ul className="space-y-2">
            {mySlots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-800/40 border border-surface-200/5 px-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="w-4 h-4 text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-white truncate">
                    {dayNames[slot.date] || slot.date} · {slot.start_time} – {slot.end_time}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelModal(slot)}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger-400 bg-danger-500/10 hover:bg-danger-500/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selector de días */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 no-scrollbar snap-x">
        {dates.map((date) => {
          const daySlots = timeSlots.filter((slot) => slot.date === date);
          const dayAvailable = daySlots.filter((slot) => slot.is_available).length;
          const isActive = activeDate === date;

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              aria-pressed={isActive}
              className={`flex-1 min-w-[5.5rem] sm:min-w-[7rem] snap-start rounded-xl p-2.5 sm:p-3 transition-colors text-center border ${
                isActive
                  ? 'bg-primary-500/20 border-primary-500/50 shadow-lg shadow-primary-500/10'
                  : 'glass border-transparent hover:bg-surface-700/50'
              }`}
            >
              <p className={`text-[0.7rem] sm:text-xs uppercase tracking-wider mb-1 ${isActive ? 'text-primary-400' : 'text-surface-200/40'}`}>
                {dayNames[date]}
              </p>
              <p className={`text-base sm:text-lg font-bold leading-tight ${isActive ? 'text-white' : 'text-surface-200/70'}`}>
                {date.split('-')[2]}
              </p>
              <p className={`text-[0.7rem] sm:text-xs mt-0.5 ${dayAvailable > 0 ? 'text-accent-400' : 'text-danger-400'}`}>
                {dayAvailable} libres
              </p>
            </button>
          );
        })}
      </div>

      {/* Grid de horarios */}
      {filteredSlots.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-sm text-surface-200/50">
          No hay horarios para este día.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
          {filteredSlots.map((slot, index) => {
            const status = getSlotStatus(slot);

            return (
              <button
                key={slot.id}
                type="button"
                disabled={status === 'booked' && !isAdmin}
                onClick={() => {
                  if (status === 'available') setConfirmModal(slot);
                  if (status === 'mine') setCancelModal(slot);
                  if (status === 'booked' && isAdmin) setReleaseModal(slot);
                }}
                aria-label={`${slot.start_time} a ${slot.end_time}. ${
                  status === 'available'
                    ? 'Disponible, pulsa para reservar'
                    : status === 'mine'
                      ? 'Tu reserva, pulsa para cancelar'
                      : isAdmin
                        ? `Reservado por ${slot.booked_by_name || 'otro usuario'}. Pulsa para liberar la reserva`
                        : `Reservado por ${slot.booked_by_name || 'otro usuario'}`
                }`}
                className={`text-left w-full rounded-xl p-3 sm:p-4 animate-fade-in-up stagger-${(index % 8) + 1} ${
                  status === 'available' ? 'slot-available' : ''
                } ${status === 'booked' ? 'slot-booked' : ''} ${
                  status === 'booked' && isAdmin ? 'slot-booked-admin' : ''
                } ${status === 'mine' ? 'slot-mine' : ''}`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <span className="text-base sm:text-lg font-bold text-white leading-none">
                    {slot.start_time}
                  </span>
                  {status === 'available' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-500 animate-pulse shrink-0" aria-hidden="true" />
                  )}
                  {status === 'booked' && (
                    <svg className="w-4 h-4 text-danger-400/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                  {status === 'mine' && (
                    <svg className="w-4 h-4 text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                <p className="text-[0.7rem] sm:text-xs text-surface-200/50 mb-1.5">
                  hasta {slot.end_time}
                </p>

                {status === 'available' && (
                  <p className="text-[0.7rem] sm:text-xs text-accent-400 font-medium">
                    Disponible
                  </p>
                )}
                {status === 'booked' && (
                  <p className="text-[0.7rem] sm:text-xs text-danger-400/70 font-medium truncate">
                    {slot.booked_by_name || 'Reservado'}
                  </p>
                )}
                {status === 'booked' && isAdmin && (
                  <p className="text-[0.7rem] sm:text-xs text-warning-400/90 font-semibold mt-0.5">
                    Pulsa para liberar
                  </p>
                )}
                {status === 'mine' && (
                  <p className="text-[0.7rem] sm:text-xs text-primary-400 font-medium">
                    Tu reserva
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-surface-200/40 pt-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-500/60 border border-accent-500/30" aria-hidden="true" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-danger-400/40 border border-danger-400/20" aria-hidden="true" />
          <span>Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary-500/60 border border-primary-500/30" aria-hidden="true" />
          <span>Mi reserva</span>
        </div>
        <span className="text-surface-200/25 sm:ml-auto">
          {slotsPerDay} bloques por día · 30 min
        </span>
      </div>

      {/* Modal: confirmar reserva */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-booking-title"
            className="glass-card rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto animate-scale-in"
          >
            <div className="text-center mb-5 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-accent-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 id="confirm-booking-title" className="text-lg sm:text-xl font-bold text-white mb-1.5">
                Confirmar reserva
              </h3>
              <p className="text-sm text-surface-200/60">
                ¿Deseas reservar este horario?
              </p>
            </div>

            <div className="glass rounded-xl p-3.5 sm:p-4 mb-5 sm:mb-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-surface-200/40 mb-0.5">Fecha</p>
                  <p className="text-sm sm:text-base text-white font-semibold truncate">
                    {dayNames[confirmModal.date] || confirmModal.date}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-surface-200/40 mb-0.5">Horario</p>
                  <p className="text-sm sm:text-base text-white font-semibold">
                    {confirmModal.start_time} – {confirmModal.end_time}
                  </p>
                </div>
              </div>
            </div>

            {mySlots.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs sm:text-sm mb-5 sm:mb-6">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span>
                  Ya tienes {mySlots.length} reserva{mySlots.length === 1 ? '' : 's'} activa
                  {mySlots.length === 1 ? '' : 's'} de {MAX_BOOKINGS_PER_USER} permitidas.
                  Esta se añadirá como una más.
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2.5">
              <button type="button" onClick={() => setConfirmModal(null)} className="btn-ghost w-full sm:flex-1">
                Cancelar
              </button>
              <button type="button" onClick={confirmBooking} className="btn-primary w-full sm:flex-1">
                Confirmar reserva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar cancelación */}
      {cancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCancelModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-cancel-title"
            className="glass-card rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto animate-scale-in"
          >
            <div className="text-center mb-5 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-danger-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 id="confirm-cancel-title" className="text-lg sm:text-xl font-bold text-white mb-1.5">
                ¿Cancelar tu reserva?
              </h3>
              <p className="text-sm text-surface-200/60">
                El horario quedará libre y se avisará a los usuarios sin reserva.
              </p>
            </div>

            <div className="glass rounded-xl p-3.5 sm:p-4 mb-5 sm:mb-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-surface-200/40 mb-0.5">Fecha</p>
                  <p className="text-sm sm:text-base text-white font-semibold truncate">
                    {dayNames[cancelModal.date] || cancelModal.date}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-surface-200/40 mb-0.5">Horario</p>
                  <p className="text-sm sm:text-base text-white font-semibold">
                    {cancelModal.start_time} – {cancelModal.end_time}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5">
              <button type="button" onClick={() => setCancelModal(null)} className="btn-ghost w-full sm:flex-1">
                Mantener reserva
              </button>
              <button type="button" onClick={confirmCancel} className="btn-danger w-full sm:flex-1 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: liberar reserva de otro usuario (solo admin) */}
      {releaseModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReleaseModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="release-slot-title"
            className="glass-card rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto animate-scale-in"
          >
            <div className="text-center mb-5 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-warning-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 id="release-slot-title" className="text-lg sm:text-xl font-bold text-white mb-1.5">
                Liberar horario reservado
              </h3>
              <p className="text-sm text-surface-200/60">
                Esta reserva pertenece a{' '}
                <span className="text-white font-medium">
                  {releaseModal.booked_by_name || 'otro usuario'}
                </span>
                . Se le avisará por notificación.
              </p>
            </div>

            <div className="glass rounded-xl p-3.5 sm:p-4 mb-5 sm:mb-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-surface-200/40 mb-0.5">Fecha</p>
                  <p className="text-sm sm:text-base text-white font-semibold truncate">
                    {dayNames[releaseModal.date] || releaseModal.date}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-surface-200/40 mb-0.5">Horario</p>
                  <p className="text-sm sm:text-base text-white font-semibold">
                    {releaseModal.start_time} – {releaseModal.end_time}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 text-warning-400 text-xs sm:text-sm mb-5 sm:mb-6">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>
                El horario quedará libre y también se avisará a los usuarios sin reserva.
              </span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5">
              <button type="button" onClick={() => setReleaseModal(null)} className="btn-ghost w-full sm:flex-1">
                Dejar como está
              </button>
              <button type="button" onClick={confirmRelease} className="btn-danger w-full sm:flex-1 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Liberar horario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
