/**
 * ==========================================
 *  DRIVER DE ALMACENAMIENTO: VERCEL BLOB
 * ==========================================
 *
 * Guarda los mismos archivos JSON, pero en **Vercel Blob** (el almacén
 * de objetos de Vercel). Es lo que permite que el sistema funcione en
 * un despliegue de Vercel, donde el disco del proyecto es efímero.
 *
 * Los archivos se guardan dentro de la carpeta `data/` del Blob store:
 *
 *   data/users.json
 *   data/time_slots.json
 *   data/notifications.json
 *   data/meta.json
 *
 * Puedes verlos y editarlos desde el panel de Vercel
 * (Storage → Blob) o con la CLI: `npx vercel blob`.
 *
 * Autenticación:
 * - `BLOB_READ_WRITE_TOKEN` (token del Blob store), o
 * - `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID` (OIDC, automático si el store
 *   está conectado al proyecto).
 *
 * Escrituras "atómicas": cada `put` reemplaza el objeto entero, así que
 * nunca se lee un archivo a medio escribir. Además, el commit final
 * (meta.json) usa `ifMatch` (ETag) para detectar escrituras simultáneas
 * de otra instancia y reintentar con el estado más reciente.
 */

import { del, get, list, put } from '@vercel/blob';

const PREFIX = 'data/';

/** Error de conflicto: otro proceso escribió antes que nosotros. */
export function isPreconditionError(error) {
  return (
    error?.name === 'BlobPreconditionFailedError' ||
    error?.statusCode === 412 ||
    /precondition failed/i.test(error?.message || '')
  );
}

/**
 * @param {{token?: string, prefix?: string}} options
 */
export function createBlobDriver({ token, prefix = PREFIX } = {}) {
  const accessToken =
    token || process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN || null;

  if (!accessToken) {
    throw new Error(
      'Falta el token de Vercel Blob. Configura BLOB_READ_WRITE_TOKEN en el proyecto ' +
        '(Vercel → Storage → Blob) o usa DATA_DRIVER=fs con una carpeta persistente.'
    );
  }

  const pathnameOf = (name) => `${prefix}${name}`;

  return {
    name: 'blob',
    label: 'Vercel Blob',

    /** Devuelve el contenido de un blob o `null` si no existe. */
    async read(name) {
      const result = await get(pathnameOf(name), {
        access: 'private',
        // Sin caché de CDN: siempre el contenido más reciente.
        useCache: false,
        token: accessToken,
      });

      if (!result || result.statusCode === 304 || !result.stream) {
        return { content: null, etag: null };
      }

      const content = await new Response(result.stream).text();
      return { content, etag: result.blob?.etag ?? result.etag ?? null };
    },

    /** Escribe (o sobrescribe) un blob. */
    async write(name, content, { ifMatch } = {}) {
      const result = await put(pathnameOf(name), content, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: accessToken,
        ...(ifMatch ? { ifMatch } : {}),
      });

      return { etag: result?.etag ?? null };
    },

    /** Guarda una copia del contenido roto para poder inspeccionarlo. */
    async backup(name, content, suffix) {
      await put(pathnameOf(`${name}${suffix}`), content, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: accessToken,
      }).catch(() => {});
    },

    /** Lista los nombres de archivo guardados. */
    async list() {
      const { blobs } = await list({ prefix, token: accessToken });
      return blobs
        .map((blob) => blob.pathname.slice(prefix.length))
        .filter((name) => name.endsWith('.json'));
    },

    /** Borra un blob. */
    async remove(name) {
      await del(pathnameOf(name), { token: accessToken }).catch(() => {});
    },
  };
}
