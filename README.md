# soytu.com.ar

Sitio de la suite. Explica los seis productos y cómo se combinan.

Mismo stack que el resto de las webs: **Next 16 + React 19 + Tailwind 4**, con
`output: "export"` — o sea que `next build` deja un sitio estático en `out/`.

## Ver en local

    yarn
    yarn dev

## Deploy

| Campo | Valor |
|---|---|
| Build command | `yarn build` |
| Output directory | `out` |

## Se cachea entero

Hay un service worker (`public/sw.js`) que guarda el sitio la primera vez que
alguien entra: las visitas siguientes abren al instante y andan sin conexión.
Usa *stale-while-revalidate*, así que sirve lo cacheado y en paralelo busca la
versión nueva para la próxima.

**Al publicar cambios importantes hay que subirle la versión al caché**
(`const CACHE = "soytu-v1"` en `public/sw.js`). Si no, el que ya entró antes
puede quedarse con la versión vieja.

Solo se registra en producción: en desarrollo un service worker sirviendo assets
viejos mientras editás es la forma más rápida de perder una hora buscando un bug
que no existe.

## Notas

- Blanco y negro, sin colores de acento. Sigue el tema del sistema operativo:
  oscuro por defecto y claro si el visitante tiene el equipo en claro.
- El dominio `soytu.com.ar` resuelve en DNS pero al 27/08/2026 todavía no servía
  nada. El footer de la landing de soytubot ya apunta acá.
- Los textos de cada producto salen de lo que hace hoy cada sistema. Si se suma
  una funcionalidad grande, conviene actualizarlos.

## Superadmin (app.soytu.com.ar)

`/app` muestra los comercios de los cinco productos en un solo lugar: cuántos hay,
qué producto usa cada uno y cuáles están dados de baja.

**Solo lee.** Crear y editar comercios sigue en el superadmin de cada producto,
que es el que sabe qué más hay que dejar armado al dar de alta (depósitos, listas
de precios, dominios). Dos lugares para crear un comercio se desincronizan solos.

Entra únicamente un `SUPERADMIN` activo de `admin_users` — la misma tabla que ya
usan los otros productos, así que es el mismo superadmin de siempre y no uno
nuevo. No se confía en el JWT: puede traer metadata vieja.

### Deploy

Ya no es un sitio estático: `/app` necesita servidor. En App Platform va como Web
Service con `yarn build` y `yarn start`, y estas variables:

    DATABASE_URL                    # la base compartida
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY

## Suscripciones (Mercado Pago)

Se usa **preapproval**, no Checkout Pro: es lo único que cobra todos los meses
solo y reintenta si a un comercio le rebota la tarjeta.

    MP_ACCESS_TOKEN            # con TEST- adelante, es sandbox
    NEXT_PUBLIC_MP_PUBLIC_KEY
    SOYTU_AL_NO_PAGAR          # avisar (default) | solo-lectura | suspender

**Webhook**: en Mercado Pago hay que apuntar las notificaciones a
`https://app.soytu.com.ar/api/mercadopago/webhook`. Siempre contesta 200 aunque
falle: si se le devuelve error, Mercado Pago reintenta durante días y termina
desactivando la notificación.

**No se confía en el cuerpo del aviso.** Trae solo un id y el detalle se va a
buscar a la API, así un aviso falsificado no puede marcar a nadie como pago. Los
pagos se guardan con upsert por el id de Mercado Pago, porque el mismo aviso
puede llegar dos veces.

**`external_reference` lleva el id del comercio.** Es lo único que después
permite cruzar un pago con un cliente nuestro.

### Qué pasa cuando no pagan

Hoy: **solo se avisa**. Se marca vencido y se ve en el panel, pero el comercio
sigue funcionando. Está así a propósito hasta que se decida — cortarle el sistema
a un bar en medio de un sábado a la noche es una decisión de negocio.

Las otras dos opciones (`solo-lectura` y `suspender`) están declaradas pero **sin
implementar**: hay que decidir primero.

### Lo que falta

- Probar un cobro de punta a punta. La app de Mercado Pago tiene que tener
  suscripciones habilitadas; hasta que eso esté, `/preapproval` responde
  "User bad request".
- Mandarle el link de pago al comerciante (hoy lo genera el superadmin a mano).
- Implementar `solo-lectura` y `suspender`.
