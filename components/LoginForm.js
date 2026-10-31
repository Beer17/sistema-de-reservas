'use client';

import { useState } from 'react';
import useStore from '@/lib/store';
import { DEMO_PASSWORD, DEMO_USERS } from '@/lib/data';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useStore((state) => state.login);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    // Pequeña espera para que el feedback de carga sea visible.
    await new Promise((resolve) => setTimeout(resolve, 450));

    const result = login(email, password);
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-3 sm:p-4 bg-grid relative overflow-hidden">
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
        aria-hidden="true"
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
        aria-hidden="true"
      />

      <div className="w-full max-w-md glass-card rounded-2xl p-5 sm:p-8 animate-fade-in-up relative z-10 my-4">
        {/* Cabecera */}
        <div className="text-center mb-6 sm:mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-3 sm:mb-4 shadow-lg shadow-primary-500/25">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">Agenda de Entregas</h1>
          <p className="text-surface-200/60 text-xs sm:text-sm">
            Programa tu presentación en el horario que prefieras
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-200/80 mb-2">
              Correo institucional
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200/30" aria-hidden="true">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                inputMode="email"
                enterKeyHint="next"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alumno@universidad.edu"
                className="input-field pl-10"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-surface-200/80 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200/30" aria-hidden="true">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                enterKeyHint="go"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="input-field pl-10 pr-11"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-surface-200/40 hover:text-surface-200 transition-colors rounded-lg"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19.5c-5.523 0-10-4.477-10-10 0-1.31.266-2.555.748-3.688M6.343 6.343a9.956 9.956 0 0115.314 0M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 rounded-lg bg-danger-500/20 border border-danger-500/30 text-danger-400 text-sm animate-fade-in-down"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Ingresando…
              </>
            ) : (
              <>
                Iniciar sesión
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Cuentas de demostración */}
        <div className="mt-5 sm:mt-6">
          <div className="glass rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[0.65rem] sm:text-xs text-surface-200/40 uppercase tracking-wider font-semibold">
                Cuentas de demostración
              </p>
              <span className="text-[0.65rem] sm:text-xs text-surface-200/30">
                toca para autocompletar
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword(DEMO_PASSWORD);
                    setError('');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-surface-200/60 hover:text-surface-200 hover:bg-primary-500/10 transition-colors group text-left"
                >
                  <span className="w-7 h-7 shrink-0 rounded-full bg-primary-500/20 flex items-center justify-center text-[0.65rem] font-bold text-primary-400 group-hover:bg-primary-500/30 transition-colors">
                    {demo.avatar}
                  </span>
                  <span className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="truncate">{demo.name}</span>
                    {demo.role === 'admin' && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-primary-500/15 border border-primary-500/25 text-[0.55rem] font-bold uppercase tracking-wider text-primary-300">
                        Admin
                      </span>
                    )}
                  </span>
                  <span className="block text-[0.7rem] text-surface-200/30 group-hover:text-primary-400 transition-colors truncate max-w-[9rem]">
                    {demo.email}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs text-center text-surface-200/30 mt-2.5">
              Contraseña para todas: <code className="text-primary-400/70">{DEMO_PASSWORD}</code>
            </p>
            <p className="text-[0.65rem] text-center text-surface-200/25 mt-1">
              Abel García entra como administrador; el resto son alumnos.
            </p>
          </div>

          <p className="text-[0.7rem] text-center text-surface-200/25 mt-3 leading-relaxed">
            Prototipo sin servidor: las reservas se guardan solo en este navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
