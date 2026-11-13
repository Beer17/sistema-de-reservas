#!/usr/bin/env node
/**
 * ==========================================
 *  TEST DEL DRIVER DE VERCEL BLOB
 * ==========================================
 *
 *   npm run test:blob
 *
 * Comprueba que el driver `blob` escribe, lee, lista y borra correctamente
 * los archivos JSON, y que detecta los conflictos de escritura (ETag).
 *
 * Así se verifica el camino de Vercel sin necesidad de una cuenta.
 */

import { startMockBlobServer } from './mock-blob.mjs';

const mock = await startMockBlobServer();

const { createBlobDriver, isPreconditionError } = await import(
  '../lib/storage/blob-driver.js'
);

const driver = createBlobDriver();
const results = [];

const check = (name, condition, detail = '') => {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` → ${detail}` : ''}`);
};

// Escritura
const written = await driver.write('users.json', '{"usuarios":[]}');
check('escribe un archivo JSON', written !== undefined, `etag=${written?.etag}`);

// Lectura
const read = await driver.read('users.json');
check('lee el contenido escrito', read.content === '{"usuarios":[]}', read.content);
check('devuelve el ETag', Boolean(read.etag), read.etag);

// Archivo inexistente
const missing = await driver.read('no-existe.json');
check('devuelve null si el archivo no existe', missing.content === null);

// Listado
const names = await driver.list();
check('lista los archivos guardados', names.includes('users.json'), names.join(', '));

// Sobrescritura
await driver.write('users.json', '{"usuarios":["abel"]}');
const rewritten = await driver.read('users.json');
check('sobrescribe el archivo', rewritten.content === '{"usuarios":["abel"]}');

// Escritura condicional (ifMatch) con ETag correcto
const current = await driver.read('users.json');
const okWrite = await driver.write('users.json', '{"ok":true}', { ifMatch: current.etag });
check('acepta la escritura si el ETag coincide', Boolean(okWrite));

// Escritura condicional con ETag obsoleto → conflicto
let conflict = false;
try {
  await driver.write('users.json', '{"ok":false}', { ifMatch: '"etag-antiguo"' });
} catch (error) {
  conflict = isPreconditionError(error);
}
check('detecta el conflicto con un ETag obsoleto', conflict);

// Copia de seguridad
await driver.backup('users.json', '{"roto":', '.invalid-2026-01-01');
const backup = await driver.read('users.json.invalid-2026-01-01');
check('guarda la copia de seguridad', backup.content === '{"roto":');

// Borrado
await driver.remove('users.json');
const removed = await driver.read('users.json');
check('borra el archivo', removed.content === null);

// ===== 2) Integración: json-store + booking sobre el driver blob =====

const { readState, updateState } = await import('../lib/json-store.js');
const { bookSlot, cancelSlot } = await import('../lib/booking.js');

const initial = await readState();
check(
  'json-store lee el estado completo desde Blob',
  initial.users.length === 5 && initial.timeSlots.length === 50,
  `usuarios=${initial.users.length} horarios=${initial.timeSlots.length}`
);

const booking = await updateState((current) =>
  bookSlot(current, { userId: 'user-002', slotId: 'slot-001', version: 1 })
);
check('reserva un horario', booking.result.ok === true);

// El archivo del blob debe reflejar la reserva.
const slotsBlob = mock.store.get('data/time_slots.json');
const slots = slotsBlob ? JSON.parse(slotsBlob.content) : [];
const booked = slots.find((slot) => slot.id === 'slot-001');
check(
  'el archivo time_slots.json del blob refleja la reserva',
  booked?.booked_by === 'user-002' && booked?.is_available === false,
  `booked_by=${booked?.booked_by}`
);

const usersBlob = mock.store.get('data/users.json');
const users = usersBlob ? JSON.parse(usersBlob.content) : [];
const maria = users.find((user) => user.id === 'user-002');
check(
  'el archivo users.json del blob refleja la reserva',
  maria?.has_booked_slot === true && maria?.booked_slot_id === 'slot-001',
  `reservas=${maria?.booked_slot_ids?.join(',')}`
);

const cancelling = await updateState((current) =>
  cancelSlot(current, { userId: 'user-001', slotId: 'slot-001' })
);
check('libera la reserva (como administrador)', cancelling.result.ok === true);
check(
  'genera la notificación en el blob',
  (mock.store.get('data/notifications.json')?.content || '').includes('slot_freed')
);

// ===== Resultado =====

await mock.close();

const failed = results.filter((result) => !result.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} comprobaciones correctas del driver de Vercel Blob.`
);

if (failed.length > 0) process.exit(1);
