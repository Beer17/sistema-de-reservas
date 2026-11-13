/**
 * ==========================================
 *  DOBLE (MOCK) DE LA API DE VERCEL BLOB
 * ==========================================
 *
 * Simula el almacén de objetos de Vercel en local para poder probar el
 * driver `blob` sin necesidad de una cuenta de Vercel.
 *
 * - La API (PUT / DELETE / LIST) se responde en un servidor HTTP local.
 * - La descarga del contenido (URL privada del blob) se intercepta con
 *   el MockAgent de undici, que es lo que usa el SDK de Vercel.
 *
 * Se usa en:
 *   scripts/test-blob-driver.mjs   → pruebas del driver
 *   scripts/preload-mock-blob.mjs  → pruebas de la app completa
 */

import { createServer } from 'node:http';
import { MockAgent, setGlobalDispatcher } from 'undici';

export const STORE_ID = 'storeabc';
const PREFIX = 'data/';

/**
 * Arranca el doble de Vercel Blob y configura las variables de entorno.
 * @returns {Promise<{store: Map, close: () => Promise<void>}>}
 */
export async function startMockBlobServer({ storeId = STORE_ID } = {}) {
  /** pathname → { content, etag } */
  const store = new Map();

  const api = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = url.searchParams.get('pathname');

    const send = (status, body) => {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(payload);
    };

    // Subida de un archivo (PUT /?pathname=...)
    if (req.method === 'PUT' && pathname) {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const content = Buffer.concat(chunks).toString('utf8');
        const etag = `"${Buffer.from(content).toString('base64').slice(0, 16)}"`;

        // Escritura condicional (ifMatch): si el ETag no coincide, 412.
        const ifMatch = req.headers['x-if-match'];
        const previous = store.get(pathname);
        if (ifMatch && previous && previous.etag !== ifMatch) {
          return send(412, {
            error: { code: 'precondition_failed', message: 'ETag mismatch' },
          });
        }

        store.set(pathname, { content, etag });
        send(200, {
          url: `https://${storeId}.private.blob.vercel-storage.com/${pathname}`,
          downloadUrl: `https://${storeId}.private.blob.vercel-storage.com/${pathname}?download=1`,
          pathname,
          contentType: 'application/json',
          contentDisposition: 'attachment; filename="data.json"',
          etag,
          uploadedAt: new Date().toISOString(),
          size: Buffer.byteLength(content),
        });
      });
      return;
    }

    // Borrado (POST /delete)
    if (req.method === 'POST' && url.pathname === '/delete') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const { urls = [] } = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          urls.forEach((item) => {
            // La URL viene completa: https://host/data/archivo.json
            const name = String(item).replace(/^https?:\/\/[^/]+/, '');
            store.delete(name);
          });
        } catch {
          /* mock: ignoramos payloads raros */
        }
        send(200, {});
      });
      return;
    }

    // Listado (GET /?prefix=data/)
    if (req.method === 'GET' && url.searchParams.has('prefix')) {
      const prefix = url.searchParams.get('prefix');
      const blobs = [...store.entries()]
        .filter(([name]) => name.startsWith(prefix))
        .map(([name, item]) => ({
          url: `https://${storeId}.private.blob.vercel-storage.com/${name}`,
          downloadUrl: `https://${storeId}.private.blob.vercel-storage.com/${name}?download=1`,
          pathname: name,
          size: Buffer.byteLength(item.content),
          uploadedAt: new Date().toISOString(),
          etag: item.etag,
        }));

      return send(200, { blobs, hasMore: false });
    }

    send(404, { error: { code: 'not_found', message: 'Not found' } });
  });

  await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve));
  const { port } = api.address();

  process.env.VERCEL_BLOB_API_URL = `http://127.0.0.1:${port}`;
  process.env.BLOB_READ_WRITE_TOKEN = `vercel_blob_rw_${storeId}_secret`;

  // Descarga del contenido desde la URL privada del blob.
  const mockAgent = new MockAgent();
  mockAgent.enableNetConnect();
  setGlobalDispatcher(mockAgent);

  mockAgent
    .get(`https://${storeId}.private.blob.vercel-storage.com`)
    .intercept({ path: () => true, method: 'GET' })
    .reply((options) => {
      const name = decodeURIComponent(options.path.split('?')[0]).slice(1);
      const entry = store.get(name);

      if (!entry) {
        return { statusCode: 404, data: 'not found' };
      }

      return {
        statusCode: 200,
        data: entry.content,
        responseOptions: {
          headers: { etag: entry.etag, 'content-type': 'application/json' },
        },
      };
    })
    .persist();

  return {
    store,
    close: async () => {
      api.close();
      await mockAgent.close();
    },
  };
}
