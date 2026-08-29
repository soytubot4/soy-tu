-- Un débito por comercio, aunque pague varios productos.
--
-- Mercado Pago cobra UN monto por preapproval. Con una suscripción por producto,
-- un comercio con tres productos tendría tres débitos por mes: tres resúmenes,
-- tres cosas que pueden rebotar y tres llamados cuando una rebota.
--
-- El acuerdo de cobro agrupa varias suscripciones bajo un solo preapproval. La
-- suscripción sigue diciendo QUÉ tiene contratado y a qué precio; el acuerdo dice
-- CÓMO se le cobra. Son dos preguntas distintas y por eso son dos tablas.
--
-- Un acuerdo puede tener una sola suscripción: es el caso normal del que paga un
-- solo producto. Así el código de cobro es uno solo.

BEGIN;

CREATE TABLE IF NOT EXISTS billing_agreements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 'PRUEBA' | 'pending' | 'authorized' | 'paused' | 'cancelled'
  status            text NOT NULL DEFAULT 'pending',
  -- Lo que efectivamente se le debita, siempre en pesos: es lo que entiende
  -- Mercado Pago. El precio de lista de cada producto vive en su suscripción.
  amount            numeric(14,2),
  -- Cada cuántos meses se cobra. Todas las suscripciones del acuerdo comparten
  -- frecuencia: un preapproval tiene una sola.
  months            integer NOT NULL DEFAULT 1,
  -- Con qué dólar se armó el monto, cuando hay algo cotizado en USD.
  fx_rate           numeric(14,2),
  paid_until        timestamptz,
  mp_preapproval_id text UNIQUE,
  mp_payer_email    text,
  last_event        jsonb,
  last_event_at     timestamptz,
  started_at        timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_agreements_tenant_idx ON billing_agreements (tenant_id);

-- La suscripción se cuelga de un acuerdo. Queda NULL mientras no se le cobre
-- (el que está en prueba todavía no tiene forma de pago).
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES billing_agreements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS subscriptions_agreement_idx ON subscriptions (agreement_id);

-- El preapproval pasa a vivir en el acuerdo. Dejarlo también acá serían dos
-- lugares diciendo con qué se cobra, y tarde o temprano dicen cosas distintas.
ALTER TABLE subscriptions
  DROP COLUMN IF EXISTS mp_preapproval_id,
  DROP COLUMN IF EXISTS mp_payer_email;

-- El cobro es del acuerdo, no de un producto: una plata cubre varios.
ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES billing_agreements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS subscription_payments_agreement_idx
  ON subscription_payments (agreement_id, created_at DESC);

ALTER TABLE subscription_logs
  ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES billing_agreements(id) ON DELETE CASCADE;

COMMIT;
