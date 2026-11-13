# Configurar Vercel Blob (persistencia JSON en Vercel)

Esta app guarda los datos en archivos JSON (`data/users.json`, `data/time_slots.json`, `data/notifications.json`, `data/meta.json`). En Vercel el disco es efímero/de solo lectura, así que para que las reservas persistan y se compartan hay que usar **Vercel Blob** como almacenamiento.

La integración ya está en el código: solo hay que configurar las variables de entorno y redeployar.

## 1. Obtén el token del Blob store

1. Entra a [Vercel](https://vercel.com) → tu proyecto → **Storage**.
2. Crea o abre tu Blob store (p. ej. `sistema-de-reservas-blob`).
3. Copia el **Read/Write Token** (`BLOB_READ_WRITE_TOKEN`).

> También puedes **Connect Project** (Storage → store → *Connect Project* → selecciona el proyecto y los entornos). Al conectarlo Vercel puede inyectar las credenciales automáticamente; aun así, forzar `DATA_DRIVER=blob` evita caer en el almacenamiento de disco.

## 2. Configura las variables de entorno

En **Project → Settings → Environment Variables** añade (en los entornos donde despliegas: Production y/o Preview):

| Variable | Valor | Notas |
| --- | --- | --- |
| `DATA_DRIVER` | `blob` | Fuerza el uso de Vercel Blob (evita el error `EROFS` por intentar escribir en disco). |
| `BLOB_READ_WRITE_TOKEN` | `<token del store>` | Token de lectura/escritura del Blob store. |

- Si el store ya está conectado y Vercel inyectó credenciales OIDC (`VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`), la app también puede funcionar sin el token RW; `DATA_DRIVER=blob` sigue siendo recomendable.
- No subas el token al repositorio. Para usarlo en local, descárgalo con `npx vercel env pull .env.local` (tras `npx vercel link`).

## 3. Redeploy

Las variables se aplican en nuevos despliegues:

- **Deployments →** despliegue activo → **⋯ → Redeploy**.

(Es necesario redeployar después de crear/conectar el store o cambiar variables.)

## 4. Verifica que esté activo

1. Abre `https://<tu-app>/api/state` y comprueba que la respuesta incluya:
   ```json
   "storage": { "driver": "blob", "label": "Vercel Blob" }
   ```
   Si ves `"driver":"fs"`, las variables no llegaron al entorno desplegado o falta `DATA_DRIVER`/token: revisa el entorno (Production/Preview) y redeploya.
2. Entra a la app y realiza una reserva/cancelación (ya no debe aparecer `No se pudo reservar` / `EROFS`).
3. Revisa los archivos en **Storage → `<tu-store>` → Browser**: deben existir dentro de `data/` (`users.json`, `time_slots.json`, `notifications.json`, `meta.json`). También puedes listarlos con:
   ```bash
   npx vercel blob ls data/
   ```
   En el primer acceso, si el store está vacío, la app siembra automáticamente los datos iniciales de la demo.

## Notas

- **OIDC (opcional):** si todos los proyectos conectados usan OIDC, Vercel recomienda revocar el token RW. Verifica primero que el despliegue funcione con OIDC (tras redeploy, `storage.driver` = `blob`), y solo entonces revoca el token. Si accedes al store fuera de Vercel (local, scripts/CI externos), mantén un token RW para ese uso.
- **Datos:** los JSON en Blob son la fuente de verdad y se pueden ver/editar desde el panel de Vercel. “Reiniciar demo” (usuario admin) los restaura al estado inicial.
- **Local:** por defecto se usa disco (`data/`). Para probar contra Blob en local sin cuenta: `npm run test:blob` (mock). Para usar tu store real en local: `npx vercel link` + `npx vercel env pull .env.local` + `npm run dev`.
- **Utilidades CLI:** `npm run data:info` y `npm run data:reset` operan sobre la carpeta local (`DATA_DIR`/`data/`), no sobre Blob.

## Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `storage.driver` es `"fs"` (p. ej. `/var/task/data`) | Faltan variables o no se redeployó | Añade `DATA_DRIVER=blob` y `BLOB_READ_WRITE_TOKEN`, redeploya y revisa el entorno correcto. |
| `EROFS: read-only file system ... /var/task/data/...` | Está escribiendo en disco (driver `fs`) | Igual que arriba: forzar `blob` + token + redeploy. |
| Error de token/credenciales al usar Blob | Token inválido, revocado o sin permisos | Genera un nuevo RW token en el store y actualiza `BLOB_READ_WRITE_TOKEN`. |
| `409` / “Otro dispositivo guardó…” | Escrituras simultáneas | Comportamiento esperado: la app reintenta; si persiste, recarga e intenta de nuevo. |
| El store está vacío tras desplegar | Aún no hubo lecturas/escrituras | Abre `/api/state` o la app: se siembra automáticamente. |
