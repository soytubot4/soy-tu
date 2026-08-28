# soytu.com.ar

Sitio de la suite. Explica los seis productos y cómo se combinan.

Mismo stack que el resto de las webs: **Next 16 + React 19 + Tailwind 4**, con
`output: "export"` — o sea que `next build` deja un sitio estático en `out/`.

## Ver en local

    npm install
    npm run dev

## Deploy

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
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
