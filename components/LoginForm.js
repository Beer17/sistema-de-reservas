'use client';

import { useState } from 'react';
import useStore from '@/lib/store';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simular latencia de red
    await new Promise((r) => setTimeout(r, 800));

    const result = login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Orbes decorativos */}
      <div
        className="bg-orb"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)',
          top: '-150px',
          right: '-150px',
        }}
      />
      <div
        className="bg-orb"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.1), transparent)',
          bottom: '-100px',
          left: '-100px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Marca */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4 shadow-lg shadow-primary-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Agenda de Entregas
          </h1>
          <p className="text-surface-200/60 text-sm">
            Programa tu presentación en el horario que prefieras
          </p>
        </div>

        {/* Formulario */}
        <div className="glass-card rounded-2xl p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-200/80 mb-2">
                Correo institucional
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200/30">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alumno@universidad.edu"
                  className="input-field pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-200/80 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200/30">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-fade-in-down">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Cuentas demo */}
        <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-surface-200/40 uppercase tracking-wider font-semibold mb-3 text-center">
              Cuentas de demostración
            </p>
            <div className="space-y-2">
              {[
                { name: 'Abel García', email: 'abel@universidad.edu' },
                { name: 'María López', email: 'maria@universidad.edu' },
                { name: 'Carlos Ruiz', email: 'carlos@universidad.edu' },
              ].map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword('1234');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-surface-200/60 hover:text-surface-200 hover:bg-primary-500/10 transition-all duration-200 group"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400 group-hover:bg-primary-500/30 transition-colors">
                      {demo.name.split(' ').map(n => n[0]).join('')}
                    </span>
                    {demo.name}
                  </span>
                  <span className="text-xs text-surface-200/30 group-hover:text-primary-400 transition-colors">
                    {demo.email}
                  </span>
                </button>
              ))}
              <p className="text-xs text-center text-surface-200/30 mt-2">
                Contraseña: <code className="text-primary-400/60">1234</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
