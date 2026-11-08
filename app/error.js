'use client';

export default function Error({ error, reset }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-grid relative overflow-hidden">
      <div className="glass-card rounded-2xl p-8 sm:p-10 max-w-md w-full text-center animate-fade-in-up relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-danger-500/15 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Algo salió mal</h1>
        <p className="text-sm text-surface-200/50 mb-6">
          Ocurrió un error inesperado al cargar el sistema. Puedes intentarlo de nuevo.
        </p>
        {error?.digest && (
          <p className="text-[0.7rem] text-surface-200/25 mb-4 font-mono">
            Código: {error.digest}
          </p>
        )}
        <button type="button" onClick={reset} className="btn-primary w-full">
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
