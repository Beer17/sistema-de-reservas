# Agenda de Entregas

Prototipo funcional de una agenda para que los estudiantes reserven un bloque de 30 minutos y presenten sus entregas durante una semana de clases.

Funciona **sin base de datos ni backend**: todo el estado (sesión, reservas y notificaciones) vive en el navegador con `localStorage`, así que puede desplegarse en Vercel como una app estática de Next.js sin configurar nada adicional.

---

## Demo

La app abre en la pantalla de inicio de sesión. Todas las cuentas usan la misma contraseña.

| Usuario       | Correo                   | Contraseña | Rol           |
| ------------- | ------------------------ | ---------- | ------------- |
| Abel García   | `abel@universidad.edu`   | `1234`     | Administrador |
| María López   | `maria@universidad.edu`  | `1234`     | Alumno        |
| Carlos Ruiz   | `carlos@universidad.edu` | `1234`     | Alumno        |
| Ana Torres    | `ana@universidad.edu`    | `1234`     | Alumno        |
| Luis Mendoza  | `luis@universidad.edu`   | `1234`     | Alumno        |

En el login puedes tocar cualquier cuenta para autocompletar el formulario.

### Roles

- **Administrador (Abel):** puede liberar el horario reservado por cualquier alumno y es el único que puede usar **Reiniciar demo**.
- **Alumno (resto):** solo puede reservar, reprogramar y cancelar su propia reserva.

El rol se define en `DEMO_USERS` (`lib/data.js`) y se normaliza al iniciar sesión, así que una sesión vieja guardada en el navegador no puede cambiar los permisos.

### Probar las notificaciones con un solo navegador

1. Entra como **Abel** y reserva un horario.
2. Abre el menú del avatar (arriba a la derecha) y cambia a **María**.
3. Pulsa la campana: María no recibe nada todavía.
4. Vuelve a **Abel**, cancela su reserva.
5. Cambia de nuevo a **María** y abre la campana: verás el aviso de *Horario liberado* con el botón **Reservar**.

El menú del avatar también permite cambiar de usuario y **Cerrar sesión**. La opción **Reiniciar demo** (borra reservas y notificaciones) solo aparece para el administrador.

### Probar la liberación de un horario como administrador

1. Entra como **María** y reserva un horario.
2. Cambia a **Abel** con el menú del avatar.
3. En el panel **Horarios seleccionados** verás la reserva de María con su nombre, día y hora. Pulsa **Liberar** (también puedes hacerlo desde la tarjeta del horario en la agenda).
4. Confirma **Sí, liberar**.
5. Vuelve a **María** y abre la campana: recibirá el aviso *Reserva liberada por administración* con la opción de volver a reservarlo.

---

## Funcionalidades

- Inicio de sesión con cuentas de demostración y sesión persistente.
- Semana de entregas de lunes a viernes con 10 bloques de 30 minutos por día (50 horarios).
- Selector de día con contador de horarios libres por jornada.
- Reserva con modal de confirmación y validación de horarios ya ocupados.
- Reprogramación: al reservar otro horario se libera automáticamente el anterior.
- Cancelación de reserva con confirmación.
- Notificaciones para los alumnos sin horario cuando se libera un bloque.
- Reserva rápida directamente desde la notificación.
- Contador de no leídas, marcar una o todas como leídas.
- Panel de administrador: Abel ve el resumen **Horarios seleccionados** con todas las reservas de la semana (alumno, día y hora), puede liberar cualquiera y se notifica al afectado.
- Reinicio de la demo restringido al administrador.
- Cambio rápido de usuario para probar la demo completa.
- Toasts de éxito y error.
- Diseño responsive: 2 columnas de horarios en móvil, 3 en tablet, 4–5 en laptop/escritorio.
- Modales tipo *bottom sheet* en móvil y centrados en escritorio.
- Accesibilidad: navegación por teclado, foco visible, cierre con `Escape`, etiquetas ARIA y respeto a `prefers-reduced-motion`.
- Páginas de error (`error.js`) y 404 (`not-found.js`).

---

## Stack

- [Next.js 16](https://nextjs.org) (App Router, build con Turbopack)
- [React 19](https://react.dev)
- [Zustand 5](https://zustand.docs.pmnd.rs) con middleware `persist`
- [Tailwind CSS 4](https://tailwindcss.com) vía `@tailwindcss/postcss`
- `next/font` (Inter)
- ESLint 9 + `eslint-config-next`

---

## Requisitos

- Node.js 20 o superior (probado con Node 26)
- npm 10 o superior

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

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

No hace falta configurar variables de entorno, base de datos ni servicios externos.

### Opción A: desde el panel de Vercel

1. Sube el proyecto a GitHub/GitLab/Bitbucket.
2. En Vercel, pulsa **Add New → Project** e importa el repositorio.
3. Vercel detecta Next.js automáticamente. Deja los valores por defecto:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next` (por defecto)
   - **Install Command:** `npm install`
4. Pulsa **Deploy**.

> El repositorio ya tiene la raíz del proyecto en la carpeta actual (donde está `package.json`), así que no necesitas configurar *Root Directory*.

### Opción B: desde la CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

---

## Personalización

Casi todos los datos del prototipo están en `lib/data.js`:

| Qué cambiar                | Dónde                                                      |
| -------------------------- | ---------------------------------------------------------- |
| Semana de entregas         | `WEEK_START_ISO` (lunes en formato `YYYY-MM-DD`)            |
| Cantidad de días hábiles   | `WEEK_DAYS`                                                 |
| Bloques de horario         | `TIME_BLOCKS`                                               |
| Alumnos de demostración    | `DEMO_USERS`                                                |
| Roles (admin / user)       | `role` de cada usuario en `DEMO_USERS`                      |
| Contraseña de la demo      | `DEMO_PASSWORD` (también en cada usuario)                   |

La lógica de reservas, cancelaciones y notificaciones está en `lib/store.js`.

> **Importante:** la semana es una fecha fija a propósito. Si se usara la fecha real del servidor y la del navegador podrían no coincidir y romper la hidratación de React. Para actualizar la agenda, cambia `WEEK_START_ISO` y vuelve a desplegar.

---

## Cómo se guarda la información

El estado se persiste bajo la clave `agenda-entregas-store` en `localStorage`:

- Reservas y horarios ocupados.
- Sesión del alumno actual.
- Notificaciones y cuáles fueron leídas.

Consecuencias:

- Los datos son **por navegador y por dispositivo**; no se comparten entre alumnos reales.
- Al limpiar los datos del sitio o usar una ventana privada, la demo vuelve a su estado inicial.
- Si cambias la estructura de los datos en `lib/data.js`, usa **Reiniciar demo** en el menú del avatar (o borra el `localStorage`) para evitar estados viejos.

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
│  ├─ Dashboard.js        # Layout autenticado
│  ├─ Header.js           # Barra superior, menú de usuario y cambio de alumno
│  ├─ LoginForm.js        # Inicio de sesión y cuentas demo
│  ├─ NotificationPanel.js# Panel de notificaciones
│  ├─ ScheduleGrid.js     # Días, horarios y modales de reserva/cancelación
│  ├─ StoreHydration.js   # Espera a la rehidratación de localStorage
│  └─ ToastContainer.js   # Avisos flotantes
├─ lib/
│  ├─ data.js             # Usuarios demo, semana y bloques horarios
│  └─ store.js            # Estado global, reservas y notificaciones
├─ next.config.mjs
├─ postcss.config.mjs
└─ package.json
```

---

## Notas

- Es un prototipo de demostración: las contraseñas están en el código del cliente y no hay autenticación real.
- No hay persistencia compartida entre usuarios; para una versión real haría falta un backend o un servicio como Supabase/Firebase.
- El proyecto fue verificado con `npm run lint`, `npm run build` y pruebas end-to-end en Chrome (login, reserva, reprogramación, cancelación, notificaciones, cambio de alumno y layout móvil/escritorio).
