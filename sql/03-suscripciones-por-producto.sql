-- Una suscripción POR PRODUCTO, no una por comercio.
--
-- Como estaba, `subscriptions.tenant_id` era UNIQUE: un comercio podía tener una
-- sola suscripción. Pero peluqueriawilly usa tres productos y padel dos, y cada
-- producto tiene su precio: con una sola fila no hay forma de cobrarle los tres
-- ni de saber cuál de ellos dejó de pagar.
--
-- Estas tablas son de soytu nada más: ningún otro repo las declara, así que no
-- hay que replicar nada. La base es compartida, el SQL se corre una sola vez.

BEGIN;

-- ── suscripciones ───────────────────────────────────────────────────────────

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS product_id    uuid REFERENCES billing_products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS started_at    timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz,
  ADD COLUMN IF NOT EXISTS notes         text;

-- El precio de la suscripción se congela al contratar. Si mañana sube la lista,
-- al que ya está adentro no se le toca sin avisarle.
COMMENT ON COLUMN subscriptions.amount IS
  'Precio congelado al contratar. No sigue a billing_periods.price.';

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tenant_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_tenant_product_key
  ON subscriptions (tenant_id, product_id);

-- ── pagos ───────────────────────────────────────────────────────────────────

ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS method          text,
  ADD COLUMN IF NOT EXISTS description     text,
  -- Con qué dólar se convirtió. Sin esto no se puede explicar por qué el mismo
  -- plan le salió distinto a dos comercios en meses distintos.
  ADD COLUMN IF NOT EXISTS fx_rate         numeric(14,2);

CREATE INDEX IF NOT EXISTS subscription_payments_subscription_idx
  ON subscription_payments (subscription_id, created_at DESC);

-- ── qué le pasó a cada suscripción ──────────────────────────────────────────
--
-- Aparte de los pagos: los pagos son la plata que entró, esto es todo lo demás
-- (se contrató, cambió de plan, se pausó, falló un cobro). Cuando un comercio
-- llama preguntando por qué le cobraron algo, la respuesta está acá.

CREATE TABLE IF NOT EXISTS subscription_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  -- 'creada' | 'plan-cambiado' | 'pago' | 'pago-rechazado' | 'pausada' | 'cancelada' | 'nota'
  kind            text NOT NULL,
  description     text NOT NULL,
  data            jsonb,
  -- Quién lo hizo. NULL = lo hizo Mercado Pago, no una persona.
  actor_email     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_logs_tenant_idx
  ON subscription_logs (tenant_id, created_at DESC);

COMMIT;
