#!/usr/bin/env node
/**
 * ==========================================
 *  UTILIDAD DE ARCHIVOS JSON
 * ==========================================
 *
 *   npm run data:info    → resumen de los datos guardados
 *   npm run data:reset   → libera todas las reservas y borra las notificaciones
 *
 * Si borras la carpeta `data/` entera, el servidor vuelve a crear los
 * archivos con los datos iniciales de la demo en el siguiente arranque.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

const FILES = {
  users: 'users.json',
  timeSlots: 'time_slots.json',
  notifications: 'notifications.json',
  meta: 'meta.json',
};

const filePath = (name) => path.join(DATA_DIR, FILES[name]);

async function readJson(name, fallback) {
  const file = filePath(name);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.error(`⚠️  No se pudo leer ${file}: ${error.message}`);
    return fallback;
  }
}

async function writeJson(name, data) {
  await writeFile(filePath(name), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function showInfo() {
  console.log(`\n📁 Carpeta de datos: ${DATA_DIR}\n`);

  if (!existsSync(DATA_DIR)) {
    console.log('La carpeta todavía no existe. Arranca el servidor (npm run dev) y se creará.');
    return;
  }

  const entries = await readdir(DATA_DIR);
  const users = await readJson('users', []);
  const slots = await readJson('timeSlots', []);
  const notifications = await readJson('notifications', []);
  const meta = await readJson('meta', {});

  const booked = slots.filter((slot) => slot.booked_by);

  console.log(`Archivos: ${entries.join(', ')}`);
  console.log(`Usuarios: ${users.length}`);
  console.log(`Horarios: ${slots.length} (${booked.length} reservados)`);
  console.log(`Notificaciones: ${notifications.length}`);
  console.log(`Última escritura: ${meta.updatedAt ? new Date(meta.updatedAt).toLocaleString('es') : '—'}`);
  console.log(`Revisión: ${meta.revision ?? '—'}\n`);
}

async function reset() {
  if (!existsSync(DATA_DIR)) {
    console.log(`La carpeta ${DATA_DIR} no existe. Arranca el servidor una vez para crearla.`);
    return;
  }

  const slots = await readJson('timeSlots', []);

  const nextSlots = slots.map((slot) =>
    slot.booked_by
      ? {
          ...slot,
          is_available: true,
          booked_by: null,
          booked_by_name: null,
          version: (slot.version || 0) + 1,
        }
      : slot
  );

  const users = await readJson('users', []);
  const nextUsers = users.map((user) => ({
    ...user,
    booked_slot_id: null,
    booked_slot_ids: [],
    has_booked_slot: false,
  }));

  await writeJson('timeSlots', nextSlots);
  await writeJson('users', nextUsers);
  await writeJson('notifications', []);
  await writeJson('meta', { updatedAt: Date.now(), revision: (await readJson('meta', {})).revision || 1 });

  console.log('✅ Reservas liberadas y notificaciones borradas.');
}

const wantsInfo = process.argv.includes('--info');

if (wantsInfo) {
  await showInfo();
} else {
  await reset();
}
