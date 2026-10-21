'use client';

import { useState } from 'react';
import useStore from '@/lib/store';
import { DAY_NAMES, WEEK_LABEL } from '@/lib/data';

export default function ScheduleGrid() {
  const timeSlots = useStore((s) => s.timeSlots);
  const currentUser = useStore((s) => s.currentUser);
  const bookSlot = useStore((s) => s.bookSlot);
  const cancelSlot = useStore((s) => s.cancelSlot);
  const getMySlot = useStore((s) => s.getMySlot);

  const [selectedDate, setSelectedDate] = useState('2026-10-26');
  const [confirmModal, setConfirmModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);

  const mySlot = getMySlot();

  const dates = [
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
  ];

  const filteredSlots = timeSlots.filter((s) => s.date === selectedDate);

  const handleBook = (slot) => {
    setConfirmModal(slot);
  };

  const confirmBooking = () => {
    if (confirmModal) {
      bookSlot(confirmModal.id);
      setConfirmModal(null);
    }
  };

  const handleCancel = () => {
    if (mySlot) {
      setCancelModal(mySlot);
    }
  };

  const confirmCancel = () => {
    if (cancelModal) {
      cancelSlot(cancelModal.id);
      setCancelModal(null);
    }
  };

  const getSlotStatus = (slot) => {
    if (slot.booked_by === currentUser?.id) return 'mine';
    if (!slot.is_available) return 'booked';
    return 'available';
  };

  // Stats
  const totalSlots = timeSlots.length;
  const availableCount = timeSlots.filter((s) => s.is_available).length;
  const bookedCount = totalSlots - availableCount;

  return (
    <div className="space-y-6">
      {/* Header con título y stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Horarios Disponibles
          </h2>
          <p className="text-surface-200/50 text-sm">{WEEK_LABEL}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-500" />
            <span className="text-sm text-surface-200/70">
              <span className="font-semibold text-accent-400">{availableCount}</span> disponibles
            </span>
          </div>
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-danger-400" />
            <span className="text-sm text-surface-200/70">
              <span className="font-semibold text-danger-400">{bookedCount}</span> reservados
            </span>
          </div>
        </div>
      </div>

      {/* Mi reserva actual */}
      {mySlot && (
        <div className="glass-card rounded-2xl p-5 border-l-4 border-l-primary-500 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-200/50 uppercase tracking-wider font-medium">Tu reserva actual</p>
                <p className="text-lg font-bold text-white">
                  {DAY_NAMES[mySlot.date]} — {mySlot.start_time} a {mySlot.end_time}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar reserva
            </button>
          </div>
        </div>
      )}

      {/* Selector de días */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dates.map((date, i) => {
          const daySlots = timeSlots.filter((s) => s.date === date);
          const dayAvailable = daySlots.filter((s) => s.is_available).length;
          const isActive = selectedDate === date;

          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`
                flex-1 min-w-[120px] rounded-xl p-3 transition-all duration-300 text-center
                ${isActive
                  ? 'bg-primary-500/20 border border-primary-500/50 shadow-lg shadow-primary-500/10'
                  : 'glass hover:bg-surface-700/50 border border-transparent'
                }
              `}
            >
              <p className={`text-xs uppercase tracking-wider mb-1 ${isActive ? 'text-primary-400' : 'text-surface-200/40'}`}>
                {DAY_NAMES[date]}
              </p>
              <p className={`text-lg font-bold ${isActive ? 'text-white' : 'text-surface-200/70'}`}>
                {date.split('-')[2]}
              </p>
              <p className={`text-xs mt-1 ${dayAvailable > 0 ? 'text-accent-400' : 'text-danger-400'}`}>
                {dayAvailable} libres
              </p>
            </button>
          );
        })}
      </div>

      {/* Grid de horarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {filteredSlots.map((slot, i) => {
          const status = getSlotStatus(slot);

          return (
            <div
              key={slot.id}
              className={`
                rounded-xl p-4 animate-fade-in-up
                ${status === 'available' ? 'slot-available' : ''}
                ${status === 'booked' ? 'slot-booked' : ''}
                ${status === 'mine' ? 'slot-mine' : ''}
                stagger-${(i % 8) + 1}
              `}
              onClick={() => status === 'available' && handleBook(slot)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-white">
                  {slot.start_time}
                </span>
                {status === 'available' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-500 animate-pulse" />
                )}
                {status === 'booked' && (
                  <svg className="w-4 h-4 text-danger-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
                {status === 'mine' && (
                  <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <p className="text-sm text-surface-200/50 mb-1">
                {slot.start_time} — {slot.end_time}
              </p>

              {status === 'available' && (
                <p className="text-xs text-accent-400 font-medium">
                  Disponible • Click para reservar
                </p>
              )}
              {status === 'booked' && (
                <p className="text-xs text-danger-400/60 font-medium">
                  Reservado por {slot.booked_by_name}
                </p>
              )}
              {status === 'mine' && (
                <p className="text-xs text-primary-400 font-medium">
                  ✓ Tu horario reservado
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-6 text-xs text-surface-200/40 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-500/60 border border-accent-500/30" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-danger-400/40 border border-danger-400/20" />
          <span>Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary-500/60 border border-primary-500/30" />
          <span>Mi reserva</span>
        </div>
      </div>

      {/* Modal de confirmación de reserva */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-accent-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Confirmar reserva</h3>
              <p className="text-surface-200/60">
                ¿Deseas reservar el siguiente horario?
              </p>
            </div>

            <div className="glass rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-200/40 mb-1">Fecha</p>
                  <p className="text-white font-semibold">{DAY_NAMES[confirmModal.date]} {confirmModal.date.split('-')[2]}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-surface-200/40 mb-1">Horario</p>
                  <p className="text-white font-semibold">{confirmModal.start_time} - {confirmModal.end_time}</p>
                </div>
              </div>
            </div>

            {mySlot && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 text-warning-400 text-sm mb-6 animate-fade-in-down">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Ya tienes una reserva ({DAY_NAMES[mySlot.date]} {mySlot.start_time}). Se cancelará automáticamente al confirmar.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBooking}
                className="btn-primary flex-1"
              >
                Confirmar reserva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de cancelación */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-danger-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¿Cancelar reserva?</h3>
              <p className="text-surface-200/60">
                Tu horario quedará libre y otros alumnos serán notificados.
              </p>
            </div>

            <div className="glass rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-200/40 mb-1">Fecha</p>
                  <p className="text-white font-semibold">{DAY_NAMES[cancelModal.date]} {cancelModal.date.split('-')[2]}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-surface-200/40 mb-1">Horario</p>
                  <p className="text-white font-semibold">{cancelModal.start_time} - {cancelModal.end_time}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(null)}
                className="btn-ghost flex-1"
              >
                Mantener reserva
              </button>
              <button
                onClick={confirmCancel}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
