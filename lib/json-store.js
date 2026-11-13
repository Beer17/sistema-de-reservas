/**
 * ==========================================
 *  ALMACÉN DE ARCHIVOS JSON (servidor)
 * ==========================================
 *
 * Sustituye a la base de datos: el estado del sistema vive en archivos
 * JSON dentro de la carpeta `data/` (o en la ruta que indique `DATA_DIR`).
 *
 *   data/users.json         → los usuarios (nombre, correo, contraseña, rol)
 *   data/time_slots.json    → los horarios y quién tiene cada uno
 *   data/notifications.json → las notificaciones
 *   data/meta.json          → metadatos (fecha de actualización y revisión)
 *
 * Ventajas:
 * - Se edita a mano con cualquier editor (o desde otro programa).
 * - Se versiona con Git, se copia, se respalda o se integra con un cron.
 * - No hay servicio externo que configurar ni claves que rotar.
 *
 * Details:
 * - Las escrituras son atómicas (archivo temporal + `rename`).
 * - Las escrituras están serializadas con un cerrojo para que dos
 *   peticiones simultáneas no se pisen.
 * - Si un archivo se corrompe, se aparta con sufijo `.invalid-<fecha>`
 *   y se vuelve a sembrar para que la app no se caiga.
 */

import { mkdir, readFile, rename, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

import { DEMO_USERS, INITIAL_TIME_SLOTS } from './data';
import { normalizeUsers, syncBookedFlags } from './booking';

const FILES = {
  users: 'users.json',
  timeSlots: 'time_slots.json',
  notifications: 'notifications.json',
  meta: 'meta.json',
};

/**
 * Carpeta de datos.
 * - `DATA_DIR=/mnt/datos` → usa esa ruta (disco persistente en Docker/VPS).
 * - Por defecto: `<raíz del proyecto>/data`.
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

/** Carpeta de reserva si la configurada no existe o no se puede escribir. */
const FALLBACK_DIR = path.join(process.cwd(), 'data');

// Carpeta realmente en uso (puede cambiar a la de reserva).
let activeDir = DATA_DIR;

// `turbopackIgnore` evita que Turbopack rastree todo el proyecto al no
// poder acotar estáticamente la carpeta de datos (puede estar en `DATA_DIR`).
const filePath = (name) => {
  const file = FILES[name];
  if (!file) throw new Error(`Archivo de datos desconocido: "${name}"`);
  return path.join(/* turbopackIgnore: true */ activeDir, file);
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

async function ensureDataDir() {
  try {
    await mkdir(activeDir, { recursive: true });
    return activeDir;
  } catch (error) {
    // La ruta configurada no se puede usar: se cae a `<proyecto>/data`
    // para que la aplicación siga funcionando.
    if (activeDir === FALLBACK_DIR) throw error;

    console.warn(
      `[datos] No se pudo usar DATA_DIR="${activeDir}" (${error.message}). ` +
        `Se usará "${FALLBACK_DIR}".`
    );
    activeDir = FALLBACK_DIR;
    await mkdir(activeDir, { recursive: true });
    return activeDir;
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(name, fallback) {
  const file = filePath(name);

  if (!(await exists(file))) {
    const seed = typeof fallback === 'function' ? fallback() : fallback;
    await writeJsonFile(name, seed);
    return seed;
  }

  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed ?? (typeof fallback === 'function' ? fallback() : fallback);
  } catch {
    // Archivo corrupto: se aparta para poder inspeccionarlo y se vuelve a sembrar.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await rename(file, `${file}.invalid-${stamp}`).catch(() => {});
    const seed = typeof fallback === 'function' ? fallback() : fallback;
    await writeJsonFile(name, seed);
    return seed;
  }
}

/** Escritura atómica: se escribe a un temporal y se renombra. */
async function writeJsonFile(name, data) {
  await ensureDataDir();
  const file = filePath(name);
  const temp = `${file}.${process.pid}.tmp`;

  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temp, file);
}

// ===== Estado completo =====

/** Lee el estado desde los archivos JSON (creándolos si no existen). */
export async function readState() {
  await ensureDataDir();

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
    normalizeUsers(Array.isArray(users) ? users : []),
    Array.isArray(timeSlots) ? timeSlots : []
  );

  return {
    users: normalizedUsers,
    timeSlots: Array.isArray(timeSlots) ? timeSlots : [],
    notifications: Array.isArray(notifications) ? notifications : [],
    updatedAt: meta?.updatedAt || Date.now(),
    revision: meta?.revision || 1,
  };
}

/** Escribe el estado completo en los archivos JSON. */
export async function writeState(state) {
  const revision = (state.revision || 0) + 1;
  const updatedAt = Date.now();

  await ensureDataDir();

  await writeJsonFile('users', state.users);
  await writeJsonFile('timeSlots', state.timeSlots);
  await writeJsonFile('notifications', state.notifications);
  await writeJsonFile('meta', { updatedAt, revision });

  return { ...state, revision, updatedAt };
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

    const saved = await writeState(result.state);
    return { result: { ...result, state: saved }, state: saved };
  });
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
