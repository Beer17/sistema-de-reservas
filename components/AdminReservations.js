'use client';

import { useEffect, useMemo, useState } from 'react';
import useStore from '@/lib/store';
import { buildScheduleMeta } from '@/lib/schedule';

/**
 * Resumen solo para administradores: muestra todas las reservas
 * del periodo, sin importar el día que esté abierto
 * en el sistema, con la opción de liberarlas.
 */
export default function AdminReservations() {
  const timeSlots = useStore((state) => state.timeSlots);
  const currentUser = useStore((state) => state.currentUser);
  const users = useStore((state) => state.users);
  const cancelSlot = useStore((state) => state.cancelSlot);
  const addToast = useStore((state) => state.addToast);

  const [releaseTarget, setReleaseTarget] = useState(null);

  const reservations = useMemo(
    () => timeSlots.filter((slot) => !slot.is_available),
    [timeSlots]
  );

  const isAdmin = currentUser?.role === 'admin';

  const { dayNames, weekShort } = useMemo(
    () => buildScheduleMeta(timeSlots),
    [timeSlots]
  );

  // Cerrar el modal con Escape
  useEffect(() => {
    if (!releaseTarget) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setReleaseTarget(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [releaseTarget]);

  if (!isAdmin) return null;

  const avatarFor = (slot) =>
    users.find((user) => user.id === slot.booked_by)?.avatar || '??';

  const confirmRelease = async () => {
    if (!releaseTarget) return;
    const result = await cancelSlot(releaseTarget.id);
    setReleaseTarget(null);

    if (!result.success) {
      addToast({
        type: 'error',
        title: 'No se pudo liberar',
        message: result.error || 'Inténtalo de nuevo.',
      });
    }
  };

  return (
    <section className="mb-6 sm:mb-8" aria-labelledby="admin-reservations-title">
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2
              id="admin-reservations-title"
              className="text-base sm:text-lg font-bold text-white flex items-center gap-2"
            >
              Horarios seleccionados
              <span className="px-1.5 py-0.5 rounded-md bg-primary-500/15 border border-primary-500/30 text-[0.55rem] font-bold uppercase tracking-wider text-primary-300">
                Admin
              </span>
            </h2>
            <p className="text-xs text-surface-200/45 mt-0.5">
              Todos los días del periodo ({weekShort}) ·{' '}
              <span className="text-accent-400 font-medium">
                {reservations.length}
              </span>{' '}
              de {timeSlots.length} reservados
            </p>
          </div>
        </div>

        {reservations.length === 0 ? (
          <div className="rounded-xl bg-surface-800/30 border border-surface-200/5 p-5 text-center">
            <p className="text-sm text-surface-200/45">
              Todavía no hay reservas.
            </p>
            <p className="text-xs text-surface-200/25 mt-1">
              Cuando un usuario reserve, aparecerá aquí con su nombre y horario.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[15rem] overflow-y-auto pr-1">
            {reservations.map((slot) => {
              const isMine = slot.booked_by === currentUser.id;

              return (
                <li
                  key={slot.id}
                  className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface-800/40 border border-surface-200/5"
                >
                  <span className="w-8 h-8 shrink-0 rounded-full bg-primary-500/20 flex items-center justify-center text-[0.65rem] font-bold text-primary-300">
                    {avatarFor(slot)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium leading-tight truncate">
                      {slot.booked_by_name || 'Usuario'}
                      {isMine && (
                        <span className="ml-1.5 text-[0.65rem] font-semibold text-primary-300">
                          (tú)
                        </span>
                      )}
                    </p>
                    <p className="text-[0.7rem] sm:text-xs text-surface-200/45 leading-tight mt-0.5 truncate">
                      {dayNames[slot.date] || slot.date} · {slot.start_time} –{' '}
                      {slot.end_time}
                    </p>
                  </div>

                  {isMine ? (
                    <span className="shrink-0 px-2 py-1 rounded-lg bg-primary-500/15 text-[0.65rem] font-semibold text-primary-300">
                      Tu reserva
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReleaseTarget(slot)}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-danger-500/10 text-danger-400 text-[0.7rem] font-semibold hover:bg-danger-500/20 transition-colors"
                    >
                      Liberar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal para confirmar la liberación */}
      {releaseTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReleaseTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-release-title"
            className="glass-card rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto animate-scale-in"
          >
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-warning-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 id="admin-release-title" className="text-lg font-bold text-white mb-1.5">
                Liberar horario
              </h3>
              <p className="text-sm text-surface-200/60">
                Se liberará la reserva de{' '}
                <span className="text-white font-medium">
                  {releaseTarget.booked_by_name || 'este usuario'}
                </span>{' '}
                y se le avisará por notificación.
              </p>
            </div>

            <div className="glass rounded-xl p-3.5 sm:p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-surface-200/40 mb-0.5">Fecha</p>
                  <p className="text-sm text-white font-semibold truncate">
                    {dayNames[releaseTarget.date] || releaseTarget.date}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-surface-200/40 mb-0.5">Horario</p>
                  <p className="text-sm text-white font-semibold">
                    {releaseTarget.start_time} – {releaseTarget.end_time}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setReleaseTarget(null)}
                className="btn-ghost w-full sm:flex-1"
              >
                Dejar como está
              </button>
              <button
                type="button"
                onClick={confirmRelease}
                className="btn-danger w-full sm:flex-1"
              >
                Sí, liberar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
