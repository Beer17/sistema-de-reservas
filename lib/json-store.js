/**
 * ==========================================
 *  ALMACÉN DE ARCHIVOS JSON (servidor)
 * ==========================================
 *
 * Sustituye a la base de datos: el estado del sistema vive en archivos
 * JSON que se pueden editar a mano, versionar con Git o integrar con
 * cualquier programa.
 *
 *   data/users.json         → los usuarios (nombre, correo, contraseña, rol)
 *   data/time_slots.json    → los horarios y quién tiene cada uno
 *   data/notifications.json → las notificaciones
 *   data/meta.json          → metadatos (fecha de actualización y revisión)
 *
 * Details:
 * - El sitio donde se guardan decide el driver (`lib/storage/`):
 *   disco local (`fs`) o Vercel Blob (`blob`), que es lo que hace que
 *   el sistema también funcione en un despliegue de Vercel.
 * - Las escrituras son atómicas (archivo temporal + `rename` en disco;
 *   reemplazo completo del objeto en Blob).
 * - Las escrituras están serializadas con un cerrojo y el commit final
 *   (`meta.json`) se hace de forma condicional, así dos peticiones
 *   simultáneas no se pisan.
 * - Si un archivo se corrompe, se aparta con sufijo `.invalid-<fecha>`
 *   y se vuelve a sembrar para que la app no se caiga.
 */

import { DEMO_USERS, INITIAL_TIME_SLOTS } from './data.js';
import { normalizeUsers, syncBookedFlags } from './booking.js';
import { getStorageDriver } from './storage/index.js';

const FILES = {
  users: 'users.json',
  timeSlots: 'time_slots.json',
  notifications: 'notifications.json',
  meta: 'meta.json',
};

/** Estado semilla con el que se crea la demo por primera vez. */
export function buildSeedState() {
  const timeSlots = INITIAL_TIME_SLOTS.map((slot) => ({ ...slot }));
  const users = syncBookedFlags(
    DEMO_USERS.map((user) => ({ ...user })),
    timeSlots
  );

  return {
    users,
    timeSlots,
    notifications: [],
    updatedAt: Date.now(),
    revision: 1,
  };
}

// ===== Cerrojo de escritura =====
// Encadena las operaciones para que dos peticiones a la vez no se pisen.

let queue = Promise.resolve();

export function withLock(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

// ===== Lectura / escritura de archivos =====

const serialize = (data) => `${JSON.stringify(data, null, 2)}\n`;

async function readJsonFile(name, fallback) {
  const driver = getStorageDriver();
  const file = FILES[name];
  const seed = typeof fallback === 'function' ? fallback() : fallback;

  const { content, etag } = await driver.read(file);

  if (content === null) {
    await driver.write(file, serialize(seed));
    return { data: seed, etag: null };
  }

  try {
    const parsed = JSON.parse(content);
    return { data: parsed ?? seed, etag: etag ?? null };
  } catch {
    // Archivo corrupto: se aparta para poder inspeccionarlo y se vuelve a sembrar.
    const stamp = `.invalid-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    await driver.backup(file, content, stamp);
    await driver.write(file, serialize(seed));
    return { data: seed, etag: null };
  }
}

// ===== Estado completo =====

/** Lee el estado desde los archivos JSON (creándolos si no existen). */
export async function readState() {
  const seed = buildSeedState();

  const users = await readJsonFile('users', () => seed.users.map((user) => ({ ...user })));
  const timeSlots = await readJsonFile('timeSlots', () =>
    seed.timeSlots.map((slot) => ({ ...slot }))
  );
  const notifications = await readJsonFile('notifications', () => []);
  const meta = await readJsonFile('meta', () => ({
    updatedAt: seed.updatedAt,
    revision: seed.revision,
  }));

  const normalizedUsers = syncBookedFlags(
    normalizeUsers(Array.isArray(users.data) ? users.data : []),
    Array.isArray(timeSlots.data) ? timeSlots.data : []
  );

  return {
    users: normalizedUsers,
    timeSlots: Array.isArray(timeSlots.data) ? timeSlots.data : [],
    notifications: Array.isArray(notifications.data) ? notifications.data : [],
    updatedAt: meta.data?.updatedAt || Date.now(),
    revision: meta.data?.revision || 1,
    etag: meta.etag ?? null,
  };
}

/** Escribe el estado completo en los archivos JSON. */
export async function writeState(state, { etag } = {}) {
  const driver = getStorageDriver();
  const revision = (state.revision || 0) + 1;
  const updatedAt = Date.now();

  await driver.write(FILES.users, serialize(state.users));
  await driver.write(FILES.timeSlots, serialize(state.timeSlots));
  await driver.write(FILES.notifications, serialize(state.notifications));

  // Commit: `meta.json` es el que da el visto bueno (y detecta conflictos).
  const meta = await driver.write(
    FILES.meta,
    serialize({ updatedAt, revision }),
    etag ? { ifMatch: etag } : {}
  );

  return { ...state, revision, updatedAt, etag: meta?.etag ?? null };
}

/** Error de conflicto: otra instancia escribió antes. */
export class ConflictError extends Error {
  constructor(message = 'Otro dispositivo guardó un cambio al mismo tiempo.') {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

/**
 * Lee, aplica una mutación y guarda el resultado (todo bajo cerrojo).
 *
 * @param {(state: object) => {ok: boolean, state?: object, ...}} mutator
 */
export async function updateState(mutator) {
  return withLock(async () => {
    const current = await readState();
    const result = mutator(current);

    if (!result?.ok) {
      return { result, state: current };
    }

    try {
      const saved = await writeState(result.state, { etag: current.etag });
      return { result: { ...result, state: saved }, state: saved };
    } catch (error) {
      if (!isConflict(error)) throw error;

      // Otra instancia escribió entre medias: se reintenta con el estado
      // más reciente (la mutación se vuelve a validar).
      const fresh = await readState();
      const retry = mutator(fresh);

      if (!retry?.ok) {
        return { result: retry, state: fresh };
      }

      try {
        const saved = await writeState(retry.state, { etag: fresh.etag });
        return { result: { ...retry, state: saved }, state: saved };
      } catch (retryError) {
        if (isConflict(retryError)) {
          throw new ConflictError();
        }
        throw retryError;
      }
    }
  });
}

/** Detecta el error de precondición de Vercel Blob (ETag no coincide). */
function isConflict(error) {
  return (
    error?.name === 'BlobPreconditionFailedError' ||
    error?.statusCode === 412 ||
    /precondition failed/i.test(error?.message || '')
  );
}

/**
 * Restaura los archivos JSON al estado inicial de la demo.
 */
export async function resetFiles() {
  return withLock(async () => {
    const seed = buildSeedState();
    return writeState(seed);
  });
}
