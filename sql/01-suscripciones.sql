-- ═══════════════════════════════════════════════════════════════════════════
-- Suscripciones (Mercado Pago)
--
-- Una fila por comercio: en qué estado está su pago y hasta cuándo tiene el
-- servicio pago. Vive en la base compartida porque el cobro es de soytu, no de
-- un producto: un comercio con gestión + fidelidad paga una sola vez.
--
-- `status` sigue el vocabulario de Mercado Pago para no traducir dos veces:
--   PRUEBA      el mes de prueba, sin haber pagado nunca
--   authorized  suscripción activa y al día
--   paused      el comerciante la pausó
--   cancelled   dada de baja
--   VENCIDA     se acabó la prueba o falló el cobro y pasó el período de gracia
--
-- `mp_preapproval_id` es el id de la suscripción en Mercado Pago. Es lo único
-- que permite cruzar un webhook con un comercio, así que sin eso el pago llega
-- y no se sabe de quién es.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

  status            text NOT NULL DEFAULT 'PRUEBA',
  -- Hasta cuándo tiene servicio. Durante la prueba, cuándo se termina.
  paid_until        timestamptz,
  -- Cuánto se le cobra por mes, congelado: si mañana sube la lista, al que ya
  -- estaba no se le cambia el precio sin avisarle.
  amount            numeric(14, 2),
  currency          text NOT NULL DEFAULT 'ARS',

  mp_preapproval_id text UNIQUE,
  mp_payer_email    text,

  -- Último webhook recibido, crudo. Cuando un cobro no aparece y Mercado Pago
  -- dice que lo mandó, esto es lo único que zanja la discusión.
  last_event        jsonb,
  last_event_at     timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status, paid_until);

-- Historial de cobros. Se guarda aparte de la suscripción porque un comercio
-- tiene una suscripción y muchos pagos, y hace falta poder mostrarle el detalle.
CREATE TABLE IF NOT EXISTS subscription_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mp_payment_id text UNIQUE,
  status        text NOT NULL,
  amount        numeric(14, 2),
  currency      text NOT NULL DEFAULT 'ARS',
  paid_at       timestamptz,
  raw           jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_payments_tenant_idx
  ON subscription_payments (tenant_id, created_at DESC);
