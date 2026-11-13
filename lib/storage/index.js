/**
 * ==========================================
 *  SELECCIÓN DEL ALMACENAMIENTO
 * ==========================================
 *
 * El sistema siempre habla de "archivos JSON". Solo cambia dónde viven:
 *
 * - `fs`   → archivos en el disco del servidor (`DATA_DIR`).
 *            Local, Docker, VPS, Azure App Service...
 * - `blob` → Vercel Blob (mismos archivos, pero en el almacén de Vercel).
 *            Necesario en Vercel, donde el disco es efímero.
 *
 * Se elige automáticamente:
 * - `DATA_DRIVER=fs|blob` → fuerza el driver.
 * - Si hay token de Blob (`BLOB_READ_WRITE_TOKEN` u OIDC) → `blob`.
 * - Si no → `fs`.
 */

import path from 'node:path';

import { createBlobDriver } from './blob-driver.js';
import { createFsDriver } from './fs-driver.js';

let driver = null;

/** ¿Hay credenciales de Vercel Blob disponibles? */
export function hasBlobCredentials() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
  );
}

/**
 * Devuelve el driver de almacenamiento (lo crea la primera vez).
 */
export function getStorageDriver() {
  if (driver) return driver;

  const explicit = String(process.env.DATA_DRIVER || '').trim().toLowerCase();
  const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : undefined;

  if (explicit === 'fs') {
    driver = createFsDriver({ dir: dataDir });
    return driver;
  }

  if (explicit === 'blob') {
    driver = createBlobDriver();
    return driver;
  }

  if (hasBlobCredentials()) {
    driver = createBlobDriver();
    return driver;
  }

  driver = createFsDriver({ dir: dataDir });
  return driver;
}

/** Solo para pruebas: cambia el driver en caliente. */
export function __setStorageDriver(next) {
  driver = next;
}
