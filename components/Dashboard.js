'use client';

import useStore from '@/lib/store';

import Header from '@/components/Header';
import LoginForm from '@/components/LoginForm';
import ScheduleGrid from '@/components/ScheduleGrid';
import ToastContainer from '@/components/ToastContainer';
import AdminReservations from '@/components/AdminReservations';
import { DAY_NAMES, WEEK_LABEL, WEEK_SHORT } from '@/lib/data';

export default function Dashboard() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const currentUser = useStore((state) => state.currentUser);
  const timeSlots = useStore((state) => state.timeSlots);
  const cloudStatus = useStore((state) => state.cloudStatus);

  if (!isAuthenticated || !currentUser) {
    return <LoginForm />;
  }

  const mySlot = currentUser.booked_slot_id
    ? timeSlots.find((slot) => slot.id === currentUser.booked_slot_id)
    : null;

  return (
    <div className="min-h-dvh flex flex-col bg-grid relative overflow-x-hidden">
      {/* Orbes decorativos (solo en pantallas grandes para no castigar el móvil) */}
      <div
        className="bg-orb hidden sm:block"
        style={{
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)',
          top: '100px',
          right: '-200px',
        }}
        aria-hidden="true"
      />
      <div
        className="bg-orb hidden sm:block"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent)',
          bottom: '100px',
          left: '-100px',
        }}
        aria-hidden="true"
      />

      <Header />

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {cloudStatus === 'local' && (
          <div className="mb-4 rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-xs sm:text-sm text-warning-400">
            <p className="font-semibold mb-0.5">Modo local: no se ve entre dispositivos</p>
            <p className="text-warning-400/80">
              Configura <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en Vercel para que la reserva de Juanito se vea en tu perfil de Abel.
              Ver <code className="font-mono">.env.example</code> y <code className="font-mono">supabase/schema.sql</code>.
            </p>
          </div>
        )}
        {cloudStatus === 'error' && (
          <div className="mb-4 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-xs sm:text-sm text-danger-400">
            No se pudo sincronizar con la nube. Revisa las variables de Supabase y reintenta.
          </div>
        )}
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          {/* Saludo */}
          <div className="mb-6 sm:mb-8 animate-fade-in-up">
            <p className="text-[0.7rem] sm:text-xs uppercase tracking-wider text-primary-400/80 font-semibold mb-1">
              {WEEK_LABEL}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
              Hola,{' '}
              <span className="gradient-text">
                {currentUser.name.split(' ')[0]}
              </span>
              {currentUser.role === 'admin' && (
                <span className="inline-flex align-middle ml-2 px-2 py-0.5 rounded-lg bg-primary-500/15 border border-primary-500/30 text-[0.65rem] font-bold uppercase tracking-wider text-primary-300">
                  Admin
                </span>
              )}
            </h1>
            <p className="text-sm sm:text-base text-surface-200/50">
              {mySlot ? (
                <>
                  Tu reserva está confirmada para el{' '}
                  <span className="text-white font-medium">
                    {DAY_NAMES[mySlot.date] || mySlot.date}
                  </span>{' '}
                  de {mySlot.start_time} a {mySlot.end_time}.
                </>
              ) : (
                'Elige el horario que prefieras para hacer tu reserva.'
              )}
            </p>
            {currentUser.role === 'admin' && (
              <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-primary-300/80">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Modo administrador: pulsa un horario ocupado para liberarlo.
              </p>
            )}
          </div>

          {/* Tarjetas informativas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="glass-card rounded-xl p-3 sm:p-4 animate-fade-in-up stagger-1">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-primary-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.65rem] sm:text-xs text-surface-200/40 uppercase tracking-wider">Periodo</p>
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">{WEEK_SHORT}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-3 sm:p-4 animate-fade-in-up stagger-2">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-accent-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.65rem] sm:text-xs text-surface-200/40 uppercase tracking-wider">Duración</p>
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">30 min</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-3 sm:p-4 animate-fade-in-up stagger-3 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-warning-400/15 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.65rem] sm:text-xs text-surface-200/40 uppercase tracking-wider">Límite</p>
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">1 reserva por usuario</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de reservas (solo admin) */}
          <AdminReservations />

          {/* Grid de horarios */}
          <ScheduleGrid />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-200/5 py-4 text-center">
        <p className="text-[0.7rem] text-surface-200/25 px-4">
          Sistema de Reservas © 2026 — Prototipo
        </p>
      </footer>

      <ToastContainer />
    </div>
  );
}
