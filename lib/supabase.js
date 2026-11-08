'use client';

import { createBrowserClient } from '@supabase/ssr';

let client = null;
let cachedKey = '';

function getKey() {
  // Acepta el nombre moderno (PUBLISHABLE) y el clásico (ANON)
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * ¿Está configurada la sincronización en la nube?
 * Define en Vercel:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * Sin esto la app funciona en modo local (por navegador).
 */
export function isCloudConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && getKey()
  );
}

export function getSupabase() {
  if (typeof window === 'undefined') return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = getKey();

  if (!url || !anonKey) return null;

  const key = `${url}|${anonKey}`;
  if (client && cachedKey === key) return client;

  client = createBrowserClient(url, anonKey);
  cachedKey = key;
  return client;
}
