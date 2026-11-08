import Link from 'next/link';

export const metadata = {
  title: 'Página no encontrada',
};

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-grid relative overflow-hidden">
      <div className="glass-card rounded-2xl p-8 sm:p-10 max-w-md w-full text-center animate-fade-in-up relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/15 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-3.75-3.75m0 0L8.25 8.25m3.75 3.75l3.75-3.75m-3.75 3.75l-3.75 3.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-5xl font-bold gradient-text mb-2">404</p>
        <h1 className="text-xl font-bold text-white mb-2">Esta página no existe</h1>
        <p className="text-sm text-surface-200/50 mb-6">
          Puede que el enlace esté mal escrito o que la página se haya movido.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center justify-center gap-2 w-full">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
