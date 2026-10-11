# soytu — sitio de la suite + billing

> **Parte del ecosistema soytu** (workspace `soytubot4`): las reglas completas
> del ecosistema viven en el `CLAUDE.md` de la carpeta que contiene todos los
> repos. Lo mínimo si este repo está clonado suelto:
> - La base Postgres es UNA y compartida entre todos los productos: filtrá
>   SIEMPRE por `tenantId` explícito (RLS está deshabilitado; el aislamiento
>   lo da solo el código).
> - Migraciones: SQL corrido UNA sola vez contra la base de prod
>   (DigitalOcean) y replicado en Supabase (testeo local).
> - Commits sin `Co-Authored-By` ni menciones a IA. Español argentino con
>   voseo en UI, commits y comentarios. Cero emojis: iconos de `lucide-react`.

soytu.com.ar: la landing de la suite + el panel de billing. **Este repo es la
ÚNICA verdad del billing**: suscripciones, cobros por Mercado Pago, y la API
que los demás productos consultan para saber si un comercio pagó. Escribe en
la base de prod — es el repo más sensible del ecosistema y el que menos
tooling tiene (sin tests, sin ESLint): tocar con cuidado.

## Estructura (NO es monorepo)

Next suelto con **yarn** (v1). `src/` + `prisma/` (schema de 9 modelos, solo
client — el DDL vive en `sql/01..04` y se corre a mano, DO primero) + `sql/`.
Dev: `app.localhost:4600` (el puerto se pasa a mano, no está en el script).

Ruteo por subdominio en `src/middleware.ts`: `soytu.com.ar` = landing;
`app.soytu.com.ar` = panel (rewrite interno a `/app`); fuera del subdominio
las rutas del panel redirigen a `/`.

## El modelo de cobro

- Suscripción **POR PRODUCTO** (qué contrató y a qué precio cada comercio) +
  `billing_agreements` agrupa varias en UN preapproval de MP (un solo débito
  mensual por comercio). Preapproval, no Checkout Pro.
- Catálogo en tres niveles: Producto → Plan → Período (el precio vive en el
  período, porque cambia con la frecuencia de pago).
- `SOYTU_AL_NO_PAGAR`: solo `avisar` está implementado; `solo-lectura` y
  `suspender` están declarados sin implementar (decisión de negocio
  pendiente — no los "completes" sin que lo pidan).

## Reglas que no se rompen

- **El webhook de MP (`/api/mercadopago/webhook`) SIEMPRE devuelve 200**: si
  devolvés error, MP reintenta durante días y termina desactivando la
  notificación. No confía en el body (va a buscar el detalle a la API de MP),
  valida la firma HMAC `x-signature` con `MP_WEBHOOK_SECRET`, y los pagos se
  upsertean por id de MP porque llegan duplicados. `external_reference` = id
  del tenant.
- **`GET /api/v1/billing/:slug`** (header `x-api-key` = `SOYTU_BILLING_KEY`,
  una sola key server-to-server, comparación timing-safe; sin key configurada
  = todo cerrado) es lo que consumen los productos. Esa consulta además
  dispara `activarVencidos`: **no hay cron** — el débito post-prueba arranca
  cuando un comerciante abre su panel. Si tocás ese endpoint, no le saques el
  side-effect.
- El superadmin de `/app` **solo lee** (crear/editar comercios sigue en el
  superadmin de cada producto) y gatea por `admin_users` activo contra la
  base, no por el JWT.

## Deuda conocida

- Varios comentarios dicen "Mercado Payment" en vez de "Mercado Pago"
  (resto de un rename accidental): corregilos cuando pases por ahí.
- `out/` es resto del export estático viejo; hoy es Web Service con
  `yarn start`.
