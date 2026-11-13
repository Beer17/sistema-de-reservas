'use client';

/**
 * ==========================================
 *  CLIENTE DE LA API DE ARCHIVOS JSON
 * ==========================================
 *
 * Envoltura fina sobre `fetch` para hablar con `/api/state`.
 * El servidor es quien lee y escribe los archivos JSON de `data/`.
 */

const ENDPOINT = '/api/state';

/** Error de API con el código HTTP y, si viene, el estado actualizado. */
export class ApiError extends Error {
  constructor(message, { status = 0, state = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.state = state;
  }
}

async function parse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

/** Descarga el estado completo del sistema. */
export async function fetchState() {
  const response = await fetch(ENDPOINT, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  const data = await parse(response);

  if (!response.ok || !data?.ok) {
    throw new ApiError(data?.error || `No se pudo leer el estado (HTTP ${response.status}).`, {
      status: response.status,
      state: data?.state ?? null,
    });
  }

  return { state: data.state, storage: data.storage ?? null };
}

/**
 * Envía una acción al servidor.
 * Devuelve `{ ok, state, message, ... }`.
 */
export async function sendAction(action, payload = {}, userId = null) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action, payload, userId }),
  });

  const data = await parse(response);

  if (!response.ok || !data?.ok) {
    throw new ApiError(data?.error || `No se pudo completar la acción (HTTP ${response.status}).`, {
      status: response.status,
      state: data?.state ?? null,
    });
  }

  return data;
}
