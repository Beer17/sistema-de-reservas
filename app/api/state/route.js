import { NextResponse } from 'next/server';
import { io } from 'next/cache';

import {
  authenticate,
  bookSlot,
  cancelSlot,
  markAllAsRead,
  markAsRead,
  resetDemo,
} from '@/lib/booking';
import { buildSeedState, readState, updateState } from '@/lib/json-store';
import { getStorageDriver } from '@/lib/storage';

/**
 * ==========================================
 *  API DEL SISTEMA DE ARCHIVOS JSON
 * ==========================================
 *
 * GET  /api/state              → estado completo (usuarios, horarios, avisos)
 * POST /api/state              → aplica una acción sobre los archivos JSON
 *
 * Acciones admitidas en el cuerpo (`{ action, payload, userId }`):
 *
 *   login          { email, password }
 *   book           { slotId, version? }
 *   cancel         { slotId }
 *   mark-read      { notificationId }
 *   mark-all-read  {}
 *   reset          {}
 *
 * La respuesta siempre incluye el estado actualizado, así el cliente no
 * tiene que hacer una segunda petición. Si algo falla, se devuelve
 * `{ ok: false, error }` con el código HTTP correspondiente.
 *
 * `io()` (de `next/cache`) marca la lectura de disco como dato en tiempo de
 * petición: con Cache Components activados, la ruta no se prerenderiza.
 */

export async function GET() {
  await io();

  try {
    const { etag, ...state } = await readState();
    const driver = getStorageDriver();

    return NextResponse.json({
      ok: true,
      state,
      storage: {
        driver: driver.name,
        label: driver.label,
        // Compatibilidad con despliegues/clientes que esperen "name".
        name: driver.label,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'No se pudo leer el estado.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  await io();

  let body = {};
  try {
    body = (await request.json()) || {};
  } catch {
    body = {};
  }

  const action = String(body.action || '');
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const userId = body.userId ? String(body.userId) : null;

  try {
    // El inicio de sesión solo valida: no modifica ningún archivo.
    if (action === 'login') {
      const state = await readState();
      const result = authenticate(state, payload);

      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
      }

      return NextResponse.json({ ok: true, user: result.user });
    }

    const { result, state } = await updateState((current) => {
      switch (action) {
        case 'book':
          return bookSlot(current, { userId, ...payload });
        case 'cancel':
          return cancelSlot(current, { userId, ...payload });
        case 'mark-read':
          return markAsRead(current, { userId, ...payload });
        case 'mark-all-read':
          return markAllAsRead(current, { userId, ...payload });
        case 'reset':
          return resetDemo(current, { userId, seed: buildSeedState() });
        default:
          return {
            ok: false,
            status: 400,
            error: `Acción desconocida: ${action || '(vacío)'}`,
          };
      }
    });

    if (!result?.ok) {
      const status = result?.status || 400;
      return NextResponse.json(
        {
          ok: false,
          error: result?.error || 'No se pudo completar la operación.',
          state,
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      state: result.state || state,
      message: result.message || null,
      notified: result.notified ?? null,
      releasedFor: result.releasedFor ?? null,
      ownerName: result.ownerName ?? null,
    });
  } catch (error) {
    // Dos dispositivos guardaron a la vez: el cliente recarga y reintenta.
    if (error?.status === 409 || error?.name === 'ConflictError') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Otro dispositivo guardó un cambio al mismo tiempo. Vuelve a intentarlo.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: error?.message || 'Error inesperado en el servidor.' },
      { status: 500 }
    );
  }
}
