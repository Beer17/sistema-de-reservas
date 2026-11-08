# Sistema de Reservas

Sistema de reservas de horarios con sincronización compartida entre dispositivos. Los usuarios reservan bloques de 30 minutos, reprograman o cancelan, y reciben notificaciones cuando se libera un espacio.

**Sincronización:** con Supabase configurado, una reserva hecha en un móvil se ve al instante en otro perfil (por ejemplo: Juanito reserva desde su celular y Abel lo ve en el suyo). Sin configuración, el sistema funciona en modo local (solo en ese navegador) para demos rápidas.

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
- **Usuario (resto):** solo puede reservar, reprogramar y cancelar su propia reserva.

El rol se define en `DEMO_USERS` (`lib/data.js`) y se normaliza al iniciar sesión, así que una sesión vieja guardada en el navegador no puede cambiar los permisos.

### Probar la sincronización entre dispositivos

1. Configura Supabase (ver sección siguiente) y despliega en Vercel con las variables de entorno.
2. Abre la URL en dos dispositivos o navegadores.
3. Entra como **María** en uno y reserva un horario.
4. Entra como **Abel** en el otro: verás la reserva de María sin recargar (Realtime) o como máximo en 3 segundos (polling de respaldo).
5. Cancela o libera esa reserva: el otro dispositivo se actualiza y la campana de notificaciones avisa a los usuarios sin reserva.

El menú del avatar también permite cambiar de usuario y **Cerrar sesión**. La opción **Reiniciar demo** (borra reservas y notificaciones) solo aparece para el administrador y también se sincroniza.

---

## Sincronización compartida (Supabase)

### Por qué hace falta una base de datos

Next.js en Vercel es *stateless*: no guarda información entre despliegues. Si el sistema viviera solo en `localStorage`, cada celular vería sus propias reservas. Para que **todos vean lo mismo** se necesita una base de datos compartida en la nube.

Este proyecto usa **Supabase** (Postgres + Realtime) con una tabla de un solo documento (`app_state`) para mantener simple la lógica actual. Plan gratuito suficiente para demos.

### Configuración en 3 pasos (una sola vez)

1. **Crea un proyecto gratuito** en <https://supabase.com> → anota tu `URL` y `anon key` (Project Settings → API).
2. **Crea la tabla:** en Supabase abre **SQL Editor**, pega todo el contenido de `supabase/schema.sql` y pulsa **Run**. Esto crea `public.app_state` y habilita Realtime.
3. **Configura Vercel:** en Vercel → tu proyecto → **Settings → Environment Variables**, crea:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key
   Luego vuelve a desplegar (**Deployments → Redeploy** o un nuevo push).

Para desarrollo local, copia `.env.example` como `.env.local` y rellena los mismos valores.

> **Si no configuras Supabase**, la app sigue funcionando en **modo local**: la cabecera muestra un aviso “Modo local” y cada navegador tendrá su propio estado. Es útil para probar la interfaz sin salir a producción.

### Cómo funciona el sincronizado

- **Fuente de verdad:** la fila `id=1` de `public.app_state` con `payload = { users, timeSlots, notifications, updatedAt, clientId }`.
- **Subida:** cada reserva/cancelación/notificación dispara una subida (debounce 400 ms) con `upsert`.
- **Bajada:** al iniciar se trae el estado remoto; luego se escucha por **Realtime** (`postgres_changes`) y con **polling cada 3 segundos** como respaldo.
- **La sesión** (quién soy yo) sigue siendo local por navegador. Lo que se comparte son las reservas, usuarios y notificaciones.

---

## Funcionalidades

- Inicio de sesión con cuentas de demostración y sesión persistente.
- Periodo de reservas de lunes a viernes con 10 bloques de 30 minutos por día (50 horarios).
- Selector de día con contador de horarios libres por jornada.
- Reserva con modal de confirmación y validación de horarios ya ocupados.
- Reprogramación: al reservar otro horario se libera automáticamente el anterior.
- Cancelación de reserva con confirmación.
- Notificaciones para usuarios sin reserva cuando se libera un bloque.
- Reserva rápida directamente desde la notificación.
- Contador de no leídas, marcar una o todas como leídas.
- Panel de administrador: Abel ve el resumen **Horarios seleccionados** con todas las reservas del periodo (usuario, día y hora), puede liberar cualquiera y se notifica al afectado.
- Reinicio de la demo restringido al administrador (también sincronizado).
- Cambio rápido de usuario para probar la demo completa.
- Indicador de estado de sincronización: *Modo local / Sincronizando… / Sincronizado / Error*.
- Toasts de éxito y error.
- Diseño responsive: 2 columnas de horarios en móvil, 3 en tablet, 4–5 en laptop/escritorio.
- Modales tipo *bottom sheet* en móvil y centrados en escritorio.
- Accesibilidad: navegación por teclado, foco visible, cierre con `Escape`, etiquetas ARIA y respeto a `prefers-reduced-motion`.
- Páginas de error (`error.js`) y 404 (`not-found.js`).

---

## Stack

- [Next.js 16](https://nextjs.org) (App Router, build con Turbopack)
- [React 19](https://react.dev)
- [Zustand 5](https://zustand.docs.pmnd.rs) con middleware `persist` (caché local)
- [Supabase](https://supabase.com) (Postgres + Realtime) para sincronización compartida
- [Tailwind CSS 4](https://tailwindcss.com) vía `@tailwindcss/postcss`
- `next/font` (Inter)
- ESLint 9 + `eslint-config-next`

---

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- (Opcional pero recomendado) cuenta gratuita de Supabase para sincronización

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

Para probar la sincronización en local, copia `.env.example` a `.env.local` y completa tu URL y anon key de Supabase.

### Scripts

| Comando         | Descripción                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Build de producción                          |
| `npm start`     | Sirve el build de producción                 |
| `npm run lint`  | Ejecuta ESLint                               |

Para verificar el build de producción:

```bash
npm run build
npm start
```

---

## Despliegue en Vercel

### Opción A: desde el panel de Vercel

1. Sube el proyecto a GitHub/GitLab/Bitbucket.
2. En Vercel, pulsa **Add New → Project** e importa el repositorio.
3. Vercel detecta Next.js automáticamente:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next` (por defecto)
   - **Install Command:** `npm install`
4. Agrega las dos variables de entorno de Supabase (ver arriba) **antes o después** del primer deploy. Si las agregas después, haz **Redeploy**.
5. Pulsa **Deploy**.

> El repositorio ya tiene la raíz del proyecto en la carpeta actual (donde está `package.json`), así que no necesitas configurar *Root Directory*.

### Opción B: desde la CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

Después agrega las variables de Supabase en el panel de Vercel y redeploy.

---

## Personalización

Casi todos los datos del prototipo están en `lib/data.js`:

| Qué cambiar                | Dónde                                                      |
| -------------------------- | ---------------------------------------------------------- |
| Periodo de reservas        | `WEEK_START_ISO` (lunes en formato `YYYY-MM-DD`)            |
| Cantidad de días hábiles   | `WEEK_DAYS`                                                 |
| Bloques de horario         | `TIME_BLOCKS`                                               |
| Usuarios de demostración   | `DEMO_USERS`                                                |
| Roles (admin / user)       | `role` de cada usuario en `DEMO_USERS`                      |
| Contraseña de la demo      | `DEMO_PASSWORD` (también en cada usuario)                   |

La lógica de reservas, cancelaciones y notificaciones está en `lib/store.js`. La conexión a la nube está en `lib/supabase.js`.

> **Importante:** el periodo usa una fecha fija a propósito. Si se usara la fecha real del servidor y la del navegador podrían no coincidir y romper la hidratación de React. Para actualizar el periodo, cambia `WEEK_START_ISO` y vuelve a desplegar.

---

## Cómo se guarda la información

- **Caché local** (por navegador): clave `sistema-reservas:v1` en `localStorage` (sesión, usuarios, horarios, notificaciones).
- **Nube compartida** (si Supabase está configurado): tabla `public.app_state`, fila `id=1`, con `payload` (mismos datos menos la sesión actual) y `updated_at`.

Consecuencias:

- Con Supabase configurado, **todos los dispositivos comparten las mismas reservas y notificaciones** (posible pagar con Realtime o polling de 3 s).
- Sin Supabase, los datos son **por navegador y por dispositivo**; no se comparten. Al limpiar los datos del sitio o usar modo privado, la demo vuelve a su estado inicial.
- Si cambias la estructura de `lib/data.js`, usa **Reiniciar demo** como administrador (o borra el `localStorage` y la fila remota) para evitar estados viejos.

En el servidor el store no toca `localStorage`; la hidratación se hace en cliente detrás de un pequeño *boot screen* (`components/StoreHydration.js`) para evitar diferencias entre el HTML del servidor y el del navegador.

---

## Estructura del proyecto

```
app/
├─ app/
│  ├─ error.js            # Pantalla de error
│  ├─ globals.css         # Tema, utilidades y estilos base
│  ├─ layout.js           # Layout raíz, fuente Inter y metadata
│  ├─ not-found.js        # 404
│  └─ page.js             # Página principal
├─ components/
│  ├─ Dashboard.js        # Layout autenticado + aviso de modo local
│  ├─ Header.js           # Barra superior, menú de usuario y estado de sincronización
│  ├─ LoginForm.js        # Inicio de sesión y cuentas demo
│  ├─ NotificationPanel.js# Panel de notificaciones
│  ├─ ScheduleGrid.js     # Días, horarios y modales de reserva/cancelación
│  ├─ StoreHydration.js   # Espera a la caché local + primera sincronización en la nube
│  └─ ToastContainer.js   # Avisos flotantes
├─ lib/
│  ├─ data.js             # Usuarios demo, periodo y bloques horarios
│  ├─ store.js            # Estado global, reservas, notificaciones y sync con Supabase
│  └─ supabase.js         # Cliente de Supabase (solo si hay variables configuradas)
├─ supabase/
│  └─ schema.sql          # Script SQL para crear la tabla compartida en Supabase
├─ .env.example            # Modelo de variables de entorno
├─ next.config.mjs
├─ postcss.config.mjs
└─ package.json
```

---

## Notas

- Es un prototipo de demostración: las contraseñas están en el código del cliente y no hay autenticación real.
- Las políticas de Supabase de este repo están abiertas para la demo (anon puede leer/escribir `app_state`). Para un sistema real, restringe las políticas y agrega autenticación de Supabase.
- Al subir un cambio gigante de datos (por ejemplo, reiniciar la demo), el sistema lo propaga a todos los dispositivos en segundos.
