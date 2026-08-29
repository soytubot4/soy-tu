/**
 * Suscripciones de Mercado Payment (preapproval).
 *
 * Se usa preapproval y no Checkout Pro porque es lo único que cobra todos los
 * meses solo, con reintentos automáticos si a un comercio le rebota la tarjeta.
 *
 * No se usa el SDK: son dos endpoints REST y el SDK traería una dependencia más
 * para envolver un `fetch`.
 */
const API = 'https://api.mercadopago.com';

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('Falta MP_ACCESS_TOKEN');
  return t;
}

/** Si estamos con credenciales de prueba. Sirve para avisarlo en el panel. */
export const isSandbox = () => (process.env.MP_ACCESS_TOKEN ?? '').startsWith('TEST-');

/**
 * A dónde vuelve el comerciante después de cargar la tarjeta.
 *
 * Mercado Pago valida la URL y rechaza `http://localhost`, así que en desarrollo
 * no sirve el origen del request: hay que mandarle una pública igual. Se
 * configura con SOYTU_APP_URL y se cae al dominio real, que siempre es válido.
 */
export function backUrl(origen: string) {
  const publica = process.env.SOYTU_APP_URL;
  if (publica) return `${publica.replace(/\/$/, '')}/app`;
  return /^https:\/\//.test(origen) ? `${origen}/app` : 'https://app.soytu.com.ar/app';
}

async function mp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Mercado Payment ${res.status}: ${(data as { message?: string }).message ?? 'error'}`,
    );
  }
  return data as T;
}

export type Preapproval = {
  id: string;
  status: string;
  init_point?: string;
  payer_email?: string;
  auto_recurring?: { transaction_amount?: number; currency_id?: string };
  external_reference?: string;
};

/**
 * Crea la suscripción y devuelve el link a donde mandar al comerciante.
 *
 * `external_reference` lleva el id de NUESTRA suscripción, no el del comercio.
 * Un comercio puede pagar soytuadmin y soytuturno por separado: con el id del
 * comercio llegaría un pago y no se sabría cuál de los dos pagó.
 *
 * `mesesPorCobro` es la frecuencia real del plan: un plan trimestral se cobra
 * cada 3 meses, no todos los meses. Mandarlo mensual le cobraría al comerciante
 * el precio del trimestre doce veces al año.
 */
export function createSubscription(params: {
  subscriptionId: string;
  nombreComercio: string;
  detalle: string;
  emailPagador: string;
  monto: number;
  mesesPorCobro: number;
  volverA: string;
}) {
  return mp<Preapproval>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: `soytu · ${params.nombreComercio} · ${params.detalle}`,
      external_reference: params.subscriptionId,
      payer_email: params.emailPagador,
      back_url: params.volverA,
      auto_recurring: {
        frequency: params.mesesPorCobro,
        frequency_type: 'months',
        // Siempre en pesos: Mercado Pago cobra en moneda local. Lo que se cotiza
        // en dolares ya viene convertido al oficial del dia.
        transaction_amount: params.monto,
        currency_id: 'ARS',
      },
      status: 'pending',
    }),
  });
}

export const getSubscription = (id: string) => mp<Preapproval>(`/preapproval/${id}`);

export type Payment = {
  id: number;
  status: string;
  transaction_amount?: number;
  currency_id?: string;
  date_approved?: string;
  external_reference?: string;
  metadata?: { preapproval_id?: string };
};

export const getPayment = (id: string) => mp<Payment>(`/v1/payments/${id}`);
