/**
 * Precarga el doble de Vercel Blob en el proceso actual.
 *
 *   NODE_OPTIONS="--import ./scripts/preload-mock-blob.mjs" npm run dev
 *
 * Así se puede probar la aplicación completa con el driver `blob`
 * sin necesidad de una cuenta de Vercel.
 */

import { startMockBlobServer } from './mock-blob.mjs';

const mock = await startMockBlobServer();

console.log(
  `[mock-blob] API de Vercel Blob simulada en ${process.env.VERCEL_BLOB_API_URL} ` +
    `(store: ${process.env.BLOB_READ_WRITE_TOKEN})`
);

process.on('SIGTERM', () => mock.close().then(() => process.exit(0)));
process.on('SIGINT', () => mock.close().then(() => process.exit(0)));
