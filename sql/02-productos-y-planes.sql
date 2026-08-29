-- ═══════════════════════════════════════════════════════════════════════════
-- Catálogo de venta: Producto → Plan → Período
--
-- Tres niveles, como en nubo, porque cada uno responde una pregunta distinta:
--
--   Producto  qué se vende            soytuadmin, soytucanje, soytuturno…
--   Plan      cuánto trae             Básico, Full — según las features
--   Período   cada cuánto y a cuánto  mensual $15.000, trimestral $40.000
--
-- Sin el tercer nivel, cobrar trimestral obligaría a duplicar el plan entero.
-- El precio vive ahí y no en el plan justamente porque cambia con la frecuencia:
-- pagar por trimestre suele salir menos por mes.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing_products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Coincide con lo que guarda `tenants.enabled_products`, así se sabe qué
  -- producto prendido corresponde a qué cosa cobrada.
  key         text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  active      boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES billing_products(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  -- Qué incluye este plan. Texto libre: son las features como se las cuenta al
  -- comerciante, no una lista técnica.
  features    text[] NOT NULL DEFAULT '{}',
  active      boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);

CREATE TABLE IF NOT EXISTS billing_periods (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    uuid NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
  -- 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
  period     text NOT NULL,
  price      numeric(14, 2) NOT NULL,
  currency   text NOT NULL DEFAULT 'ARS',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, period)
);

CREATE INDEX IF NOT EXISTS billing_plans_product_idx ON billing_plans (product_id, sort_order);
CREATE INDEX IF NOT EXISTS billing_periods_plan_idx ON billing_periods (plan_id);

-- A qué período está suscrito cada comercio. Nullable: los que ya existen no
-- tienen plan asignado todavía.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_period_id uuid REFERENCES billing_periods(id);
