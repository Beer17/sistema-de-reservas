/**
 * ==========================================
 *  DRIVER DE ALMACENAMIENTO: ARCHIVOS LOCALES
 * ==========================================
 *
 * Guarda los archivos JSON en una carpeta del disco (`DATA_DIR`).
 *
 * Es el driver por defecto y el recomendado para:
 * - desarrollo local
 * - Docker / VPS / Azure App Service (con disco persistente)
 */

import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {{dir: string, fallbackDir?: string}} options
 */
export function createFsDriver({ dir, fallbackDir } = {}) {
  const primaryDir = dir || path.join(process.cwd(), 'data');
  const backupDir = fallbackDir || path.join(process.cwd(), 'data');

  // Carpeta realmente en uso (puede cambiar a la de reserva).
  let activeDir = primaryDir;

  async function exists(file) {
    try {
      await access(file);
      return true;
    } catch {
      return false;
    }
  }

  async function ensureDir() {
    try {
      await mkdir(activeDir, { recursive: true });
      return activeDir;
    } catch (error) {
      // La ruta configurada no se puede usar: se cae a la de reserva
      // para que la aplicación siga funcionando.
      if (activeDir === backupDir) throw error;

      console.warn(
        `[datos] No se pudo usar DATA_DIR="${activeDir}" (${error.message}). ` +
          `Se usará "${backupDir}".`
      );
      activeDir = backupDir;
      await mkdir(activeDir, { recursive: true });
      return activeDir;
    }
  }

  return {
    name: 'fs',
    get label() {
      return `archivos locales (${activeDir})`;
    },

    /** Devuelve el contenido de un archivo o `null` si no existe. */
    async read(name) {
      await ensureDir();
      const file = path.join(/* turbopackIgnore: true */ activeDir, name);

      if (!(await exists(file))) return { content: null, etag: null };

      const content = await readFile(file, 'utf8');
      return { content, etag: null };
    },

    /** Escribe un archivo de forma atómica (temporal + rename). */
    async write(name, content) {
      await ensureDir();
      const file = path.join(/* turbopackIgnore: true */ activeDir, name);
      const temp = `${file}.${process.pid}.tmp`;

      await writeFile(temp, content, 'utf8');
      await rename(temp, file);

      return { etag: null };
    },

    /** Guarda una copia del contenido roto para poder inspeccionarlo. */
    async backup(name, content, suffix) {
      await ensureDir();
      const file = path.join(/* turbopackIgnore: true */ activeDir, `${name}${suffix}`);
      await writeFile(file, content, 'utf8').catch(() => {});
    },

    /** Lista los nombres de archivo guardados. */
    async list() {
      await ensureDir();
      const { readdir } = await import('node:fs/promises');
      const entries = await readdir(activeDir);
      return entries.filter((entry) => entry.endsWith('.json'));
    },

    /** Borra un archivo. */
    async remove(name) {
      await ensureDir();
      const file = path.join(/* turbopackIgnore: true */ activeDir, name);
      await rm(file, { force: true });
    },
  };
}
