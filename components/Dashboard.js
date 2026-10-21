'use client';

import useStore from '@/lib/store';
import LoginForm from '@/components/LoginForm';
import Header from '@/components/Header';
import ScheduleGrid from '@/components/ScheduleGrid';
import ToastContainer from '@/components/ToastContainer';

export default function Dashboard() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const currentUser = useStore((s) => s.currentUser);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid relative">
      {/* Orbes decorativos */}
      <div
        className="bg-orb"
        style={{
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)',
          top: '100px',
          right: '-200px',
        }}
      />
      <div
        className="bg-orb"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent)',
          bottom: '100px',
          left: '-100px',
        }}
      />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Saludo */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenido, <span className="gradient-text">{currentUser?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-surface-200/50">
            Selecciona el horario que prefieras para presentar tu entrega.
            {currentUser?.has_booked_slot
              ? ' Ya tienes una reserva activa.'
              : ' Aún no has reservado un horario.'}
          </p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 animate-fade-in-up stagger-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-surface-200/40 uppercase tracking-wider">Semana</p>
                <p className="text-sm font-semibold text-white">26 - 30 Oct</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 animate-fade-in-up stagger-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-surface-200/40 uppercase tracking-wider">Duración</p>
                <p className="text-sm font-semibold text-white">30 min / bloque</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 animate-fade-in-up stagger-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-400/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-surface-200/40 uppercase tracking-wider">Nota</p>
                <p className="text-sm font-semibold text-white">1 reserva máx.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de horarios */}
        <ScheduleGrid />
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-200/5 py-4 text-center relative z-10">
        <p className="text-xs text-surface-200/25">
          Sistema de Programación de Entregas © 2026 — Prototipo
        </p>
      </footer>

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
}
