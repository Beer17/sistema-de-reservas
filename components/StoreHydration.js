'use client';

import { useEffect, useState } from 'react';
import useStore from '@/lib/store';

/**
 * Espera a que Zustand termine de leer localStorage (caché) y después
 * descarga el estado real del servidor de archivos JSON.
 *
 * - Primero se pinta la caché (arranque rápido).
 * - Luego se reemplaza por `data/*.json` (estado real y compartido).
 * - Si el servidor no responde, la app sigue funcionando con la caché
 *   y la cabecera avisa de que no hay conexión.
 *
 * También arranca el sondeo periódico para ver los cambios que hacen
 * otros dispositivos.
 */
export default function StoreHydration({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanupSync = () => {};

    const readyFromCache = () => {
      if (!cancelled) setReady(true);
    };

    const start = async () => {
      // 1) Caché local primero (pintado rápido)
      if (useStore.persist.hasHydrated()) {
        readyFromCache();
      } else {
        const unsub = useStore.persist.onFinishHydration(readyFromCache);
        try {
          const result = useStore.persist.rehydrate();
          if (result && typeof result.catch === 'function') result.catch(readyFromCache);
        } catch {
          readyFromCache();
        }
        // Si en 800ms no llega nada, pintamos igual
        const t = setTimeout(readyFromCache, 800);
        return () => {
          cancelled = true;
          clearTimeout(t);
          unsub?.();
        };
      }

      // 2) Estado real desde los archivos JSON del servidor
      try {
        await useStore.getState().refresh({ silent: true });
      } catch {
        // La app sigue con la caché local
      }

      // 3) Sondeo para ver los cambios de otros dispositivos
      try {
        cleanupSync = useStore.getState().startSync();
      } catch {
        // Sin sondeo: la app sigue funcionando
      }

      readyFromCache();
    };

    start();

    return () => {
      cancelled = true;
      cleanupSync();
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
        <p className="text-sm text-surface-200/50">Cargando los archivos JSON del sistema…</p>
      </div>
    );
  }

  return children;
}
