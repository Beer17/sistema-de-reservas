# Sistema de Reservas

Sistema de reservas de horarios con **persistencia en archivos JSON** (sin base de datos). Los usuarios reservan bloques de 30 minutos, cancelan y reciben notificaciones cuando se libera un espacio.

Los datos viven en la carpeta `data/` del servidor, en archivos JSON legibles y editables a mano:

```
data/users.json         → los usuarios (nombre, correo, contraseña, rol)
data/time_slots.json    → los horarios y quién tiene cada uno
data/notifications.json → las notificaciones
data/meta.json          → metadatos (fecha de escritura y número de revisión)
```

Todos los dispositivos ven **la misma información** porque leen y escriben los mismos archivos del servidor. No hay servicio externo que configurar, ni claves, ni panel: se edita un JSON y listo.

---

## Demo

La app abre en el inicio de sesión. Todas las cuentas usan la misma contraseña.

| Usuario       | Correo                 | Contraseña | Rol           |
| ------------- | ---------------------- | ---------- | ------------- |
| Abel García   | `abel@empresa.com`     | `1234`     | Administrador |
| María López   | `maria@empresa.com`    | `1234`     | Usuario       |
| Carlos Ruiz   | `carlos@empresa.com`   | `1234`     | Usuario       |
| Ana Torres    | `ana@empresa.com`      | `1234`     | Usuario       |
| Luis Mendoza  | `luis@empresa.com`     | `1234`     | Usuario       |

En el login puedes tocar cualquier cuenta para autocompletar el formulario.

### Roles

- **Administrador (Abel):** puede liberar la reserva de cualquier usuario y es el único que puede usar **Reiniciar demo**.
- **Usuario (resto):** solo puede reservar y cancelar su propia reserva.

Los roles se leen de `data/users.json`. Si editas ese archivo a mano, el cambio se aplica en el siguiente arranque (la app vuelve a leer los archivos).

### Probarlo entre dispositivos

1. Arranca el servidor (`npm run dev` o `npm start`).
2. Abre la URL en dos navegadores (o dispositivos de la misma red).
3. Entra como **María** en uno y reserva un horario.
4. Entra como **Abel** en el otro: verás la reserva de María sin recargar (el sondeo refresca cada 3 s).
5. Cancela o libera esa reserva: el otro dispositivo se actualiza y la campana de notificaciones avisa a los usuarios sin reserva.

El menú del avatar permite cambiar de usuario y **Cerrar sesión**. **Reiniciar demo** (borra reservas y notificaciones) solo aparece para el administrador.

---

## Archivos JSON (el "almacén" del sistema)

### Formato de los archivos

`data/users.json`:

```json
[
  {
    "id": "user-001",
    "name": "Abel García",
    "email": "abel@empresa.com",
    "password": "1234",
    "avatar": "AG",
    "role": "admin",
    "has_booked_slot": false,
    "booked_slot_id": null,
    "booked_slot_ids": []
  }
]
```

`data/time_slots.json`:

```json
[
  {
    "id": "slot-001",
    "date": "2026-11-02",
    "start_time": "09:00",
    "end_time": "09:30",
    "is_available": true,
    "booked_by": null,
    "booked_by_name": null,
    "version": 1,
    "created_at": "2026-11-01T10:00:00.000Z"
  }
]
```

`data/notifications.json`:

```json
[
  {
    "id": "notif-abc123",
    "type": "slot_freed",
    "title": "Horario liberado",
    "message": "Se liberó el Lunes 2 de 09:00 a 09:30. ¡Reserva antes de que lo haga otro usuario!",
    "slot_id": "slot-001",
    "slot_date": "2026-11-02",
    "slot_time": "09:00 - 09:30",
    "target_user_ids": ["user-003"],
    "read_by": [],
    "created_at": "2026-11-02T08:15:00.000Z"
  }
]
```

### Reglas

- **`time_slots.json` es la fuente de verdad de las reservas.** Los campos `booked_slot_id` / `booked_slot_ids` / `has_booked_slot` de `users.json` se recalculan solos en cada lectura, así que no pueden quedar desincronizados.
- **Edita `time_slots.json` para cambiar la agenda.** La interfaz (selector de días, etiquetas de la semana, número de bloques) se deriva de los horarios guardados: si añades un día o un bloque nuevo, aparece solo.
- **Añade usuarios a `users.json`** para crear cuentas nuevas (id, nombre, correo, contraseña, avatar y `role`: `admin` o `user`).
- **Si borras un archivo**, se vuelve a crear con los datos iniciales de la demo en el siguiente arranque.
- **Si un archivo se corrompe**, se aparta con el sufijo `.invalid-<fecha>` (para poder inspeccionarlo) y se regenera.
- Las escrituras son **atómicas** (archivo temporal + `rename`) y están **serializadas** con un cerrojo, de modo que dos peticiones simultáneas no se pisan.
- Las reservas usan **bloqueo optimista** (`version`): si otra persona se adelantó, el servidor responde `409` y la interfaz avisa.

### Herramientas de línea de comandos

```bash
npm run data:info    # resumen de los datos guardados (usuarios, horarios, avisos)
npm run data:reset   # libera todas las reservas y borra las notificaciones
```

### Dónde se guardan los archivos

Por defecto, en `<raíz del proyecto>/data`. Se puede cambiar con la variable de entorno `DATA_DIR`:

```bash
DATA_DIR=/var/lib/sistema-reservas npm start
```

Si la ruta configurada no existe o no se puede escribir, la app avisa en la consola y usa `<raíz del proyecto>/data` para no quedarse sin servicio.

---

## API REST

Toda la comunicación con los archivos pasa por un único endpoint. Es la forma más fácil de integrar la app con otros sistemas (scripts, bots, otros paneles…).

### `GET /api/state`

Devuelve el estado completo.

```bash
curl http://localhost:3000/api/state
```

```json
{
  "ok": true,
  "state": {
    "users": [ ... ],
    "timeSlots": [ ... ],
    "notifications": [ ... ],
    "updatedAt": 1762627200000,
    "revision": 7
  }
}
```

### `POST /api/state`

Aplica una acción y devuelve el estado ya actualizado (no hace falta una segunda llamada).

```json
{ "action": "book", "payload": { "slotId": "slot-001", "version": 1 }, "userId": "user-002" }
```

| Acción           | `payload`                    | Qué hace                                        |
| ---------------- | ---------------------------- | ----------------------------------------------- |
| `login`          | `{ email, password }`        | Comprueba las credenciales contra `users.json` |
| `book`           | `{ slotId, version? }`       | Reserva un horario                              |
| `cancel`         | `{ slotId }`                 | Cancela (o el admin libera) una reserva         |
| `mark-read`      | `{ notificationId }`         | Marca una notificación como leída               |
| `mark-all-read`  | `{}`                         | Marca todas como leídas                         |
| `reset`          | `{}`                         | Reinicia la demo (solo admin)                   |

Ejemplos:

```bash
# Reservar el slot-001 como María
curl -X POST http://localhost:3000/api/state \
  -H "Content-Type: application/json" \
  -d '{"action":"book","payload":{"slotId":"slot-001","version":1},"userId":"user-002"}'

# Ver el estado
curl http://localhost:3000/api/state
```

Códigos de respuesta:

| Código | Significado                                                  |
| ------ | ------------------------------------------------------------ |
| `200`  | Todo correcto                                                 |
| `400`  | Acción desconocida o payload inválido                        |
| `401`  | Credenciales incorrectas                                      |
| `403`  | Sin permisos (por ejemplo, cancelar la reserva de otro)      |
| `404`  | El horario o la notificación no existen                      |
| `409`  | Conflicto: el horario ya está reservado o cambió            |

---

## Funcionalidades

- Inicio de sesión con cuentas de demostración y sesión persistente.
- Periodo de reservas de lunes a viernes con 10 bloques de 30 minutos por día (50 horarios).
- Selector de día con contador de horarios libres por jornada.
- Reserva con modal de confirmación y validación de horarios ya ocupados.
- Varias reservas activas por usuario (hasta 10).
- Cancelación de reserva con confirmación.
- Notificaciones para usuarios sin reserva cuando se libera un bloque.
- Reserva rápida directamente desde la notificación.
- Contador de no leídas, marcar una o todas como leídas.
- Panel de administrador: Abel ve el resumen **Horarios seleccionados** con todas las reservas del periodo (usuario, día y hora), puede liberar cualquiera y se notifica al afectado.
- Reinicio de la demo restringido al administrador.
- Cambio rápido de usuario para probar la demo completa.
- Indicador de estado: *Conectando… / Guardado en JSON / Sin conexión con el servidor*.
- Toasts de éxito y error.
- Diseño responsive: 2 columnas de horarios en móvil, 3 en tablet, 4–5 en laptop/escritorio.
- Modales tipo *bottom sheet* en móvil y centrados en escritorio.
- Accesibilidad: navegación por teclado, foco visible, cierre con `Escape`, etiquetas ARIA y respeto a `prefers-reduced-motion`.
- Páginas de error (`error.js`) y 404 (`not-found.js`).

---

## Stack

- [Next.js 16](https://nextjs.org) (App Router, build con Turbopack, Cache Components)
- [React 19](https://react.dev)
- [Zustand 5](https://zustand.docs.pmnd.rs) con middleware `persist` (caché local en el navegador)
- `node:fs/promises` para leer y escribir los archivos JSON del servidor
- [Tailwind CSS 4](https://tailwindcss.com) vía `@tailwindcss/postcss`
- `next/font` (Inter)
- ESLint 9 + `eslint-config-next`

---

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

No hace falta ninguna base de datos, cuenta en la nube ni clave de API.

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. En el primer arranque se crea la carpeta `data/` con los archivos de la demo.

### Scripts

| Comando             | Descripción                                         |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con recarga en caliente      |
| `npm run build`     | Build de producción                                 |
| `npm start`         | Sirve el build de producción                        |
| `npm run lint`      | Ejecuta ESLint                                      |
| `npm run data:info` | Resumen de los datos guardados                      |
| `npm run data:reset`| Libera reservas y borra notificaciones              |

---

## Despliegue

### Opción A: desde el panel de Vercel

1. Sube el proyecto a GitHub/GitLab/Bitbucket.
2. Vercel → **Add New → Project** e importa el repositorio.
3. Vercel detecta Next.js automáticamente (**Build Command:** `npm run build`).
4. **Deploy**.

> ⚠️ **Vercel es *stateless***: el sistema de archivos del proyecto es de solo lectura y efímero, así que los archivos JSON **no se conservan** entre invocaciones (y durante el despliegue se sobrescriben).
>
> Para que el sistema funcione de verdad en Vercel hay que montar un volumen: usa **Vercel Blob** (con `@vercel/blob`) o un servicio tipo **Upstash Redis / Turso** detrás de la misma API, o despliega en un servidor con disco (Docker, VPS, Azure App Service…).

### Opción B: servidor con disco (recomendado)

Cualquier hosting con sistema de archivos writable funciona tal cual:

```bash
npm ci
npm run build
DATA_DIR=/var/lib/sistema-reservas npm start
```

- **Docker**: monta un volumen, p. ej. `-v reservas:/app/data`.
- **Azure App Service**: apunta `DATA_DIR` a `/home/data` (Linux) o `C:\home\data` (Windows); la carpeta `/home` sobrevive a los despliegues.
- **VPS / servidor propio**: apunta `DATA_DIR` a la ruta que quieras.

El repositorio ya trae el flujo de GitHub Actions que compila y publica en Azure Web App (`.github/workflows/`).

---

## Personalización

| Qué cambiar                | Dónde                                                   |
| -------------------------- | ------------------------------------------------------- |
| Datos en caliente          | `data/*.json` (se editan y se aplican al reiniciar)      |
| Periodo de reservas        | `WEEK_START_ISO` en `lib/data.js` (semilla inicial)     |
| Cantidad de días hábiles   | `WEEK_DAYS` en `lib/data.js`                            |
| Bloques de horario         | `TIME_BLOCKS` en `lib/data.js`                          |
| Usuarios de demostración   | `DEMO_USERS` en `lib/data.js` (semilla) / `data/users.json` (vivo) |
| Roles (admin / user)       | `role` de cada usuario en `data/users.json`             |
| Contraseña de la demo      | `password` de cada usuario en `data/users.json`         |

La lógica de reservas, cancelaciones y notificaciones está en `lib/booking.js` (pura, la usan el servidor y el cliente). El acceso a los archivos está en `lib/json-store.js` y la API en `app/api/state/route.js`.

> **Importante:** el periodo usa una fecha fija a propósito. Si se usara la fecha real del servidor y la del navegador podrían no coincidir y romper la hidratación de React. Para actualizar el periodo, cambia `WEEK_START_ISO` y vuelve a desplegar (o edita las fechas en `data/time_slots.json`).

---

## Cómo se guarda la información

- **Archivos JSON (servidor):** `data/users.json`, `data/time_slots.json`, `data/notifications.json` y `data/meta.json`. Son la fuente de verdad y se comparten entre todos los dispositivos.
- **Caché local (por navegador):** clave `sistema-reservas:v1` en `localStorage` (sesión, usuarios, horarios, notificaciones). Solo sirve para pintar rápido al abrir; se reemplaza por el estado real del servidor en cuanto responde.
- **Sesión:** quién eres y en qué cuenta estás es local del navegador (como en la demo anterior). Lo que se comparte son las reservas, los usuarios y las notificaciones.

En el servidor el store no toca `localStorage`; la hidratación se hace en cliente detrás de un pequeño *boot screen* (`components/StoreHydration.js`) para evitar diferencias entre el HTML del servidor y el del navegador.

---

## Estructura del proyecto

```
app/
├─ app/
│  ├─ api/state/route.js  # API REST: lee y escribe los archivos JSON
│  ├─ error.js             # Pantalla de error
│  ├─ globals.css          # Tema, utilidades y estilos base
│  ├─ layout.js            # Layout raíz, fuente Inter y metadata
│  ├─ not-found.js         # 404
│  └─ page.js              # Página principal
├─ components/
│  ├─ Dashboard.js         # Layout autenticado + aviso de conexión
│  ├─ Header.js            # Barra superior, menú de usuario y estado de los archivos
│  ├─ LoginForm.js         # Inicio de sesión y cuentas (leídas de data/users.json)
│  ├─ NotificationPanel.js # Panel de notificaciones
│  ├─ ScheduleGrid.js      # Días, horarios y modales de reserva/cancelación
│  ├─ StoreHydration.js    # Caché local + primera lectura del servidor + sondeo
│  └─ ToastContainer.js    # Avisos flotantes
├─ data/                   # Archivos JSON del sistema (la "base de datos")
│  ├─ users.json
│  ├─ time_slots.json
│  ├─ notifications.json
│  └─ meta.json
├─ lib/
│  ├─ api-client.js        # Cliente HTTP de /api/state
│  ├─ booking.js           # Lógica de negocio (reservas, avisos, reinicio)
│  ├─ data.js              # Semilla inicial: periodo, bloques y cuentas demo
│  ├─ json-store.js        # Lectura/escritura atómica de los archivos JSON
│  ├─ schedule.js          # Etiquetas de la agenda derivadas de los horarios
│  └─ store.js             # Estado global (Zustand) y sincronización con la API
├─ scripts/
│  └─ reset-data.mjs       # Utilidad de línea de comandos para los archivos
├─ .env.example            # Modelo de variables de entorno
├─ next.config.mjs
├─ postcss.config.mjs
└─ package.json
```

---

## Notas

- Es un prototipo de demostración: las contraseñas están en texto plano en `data/users.json` y no hay autenticación real. Para producción, al menos sirve las contraseñas (hash) y añade una capa de sesión en el servidor.
- Los archivos JSON se versionan con Git: es cómodo para ver los cambios, pero con muchos usuarios reales conviene un motor de base de datos (la API `app/api/state/route.js` es la costura donde cambiarlo).
- Al subir un cambio grande de datos (por ejemplo, reiniciar la demo), el sistema lo propaga a todos los dispositivos en segundos.
