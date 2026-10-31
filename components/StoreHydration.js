'use client';

import { useEffect, useState } from 'react';
import useStore from '@/lib/store';

/**
 * Espera a que Zustand termine de leer localStorage antes de pintar la app.
 * Evita parpadeos y desajustes de hidratación entre servidor y cliente.
 */
export default function StoreHydration({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) setReady(true);
    };

    if (useStore.persist.hasHydrated()) {
      finish();
    }

    const unsubscribe = useStore.persist.onFinishHydration(finish);

    try {
      const result = useStore.persist.rehydrate();
      if (result && typeof result.catch === 'function') {
        result.catch(finish);
      }
    } catch {
      finish();
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  if (!ready) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6"
        role="status"
        aria-live="polite"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25 animate-pulse-glow">
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm text-surface-200/50">Cargando tu agenda…</p>
      </div>
    );
  }

  return children;
}
