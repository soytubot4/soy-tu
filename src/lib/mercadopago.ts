/**
 * Suscripciones de Mercado Pago (preapproval).
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
export const esPrueba = () => (process.env.MP_ACCESS_TOKEN ?? '').startsWith('TEST-');

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
      `Mercado Pago ${res.status}: ${(data as { message?: string }).message ?? 'error'}`,
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
 * `external_reference` lleva el id del comercio: es lo ÚNICO que después permite
 * cruzar un webhook con un cliente nuestro. Sin eso llega un pago y no se sabe
 * de quién es.
 */
export function crearSuscripcion(params: {
  tenantId: string;
  nombreComercio: string;
  emailPagador: string;
  montoMensual: number;
  volverA: string;
}) {
  return mp<Preapproval>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: `soytu · ${params.nombreComercio}`,
      external_reference: params.tenantId,
      payer_email: params.emailPagador,
      back_url: params.volverA,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: params.montoMensual,
        currency_id: 'ARS',
      },
      status: 'pending',
    }),
  });
}

export const traerSuscripcion = (id: string) => mp<Preapproval>(`/preapproval/${id}`);

export type Pago = {
  id: number;
  status: string;
  transaction_amount?: number;
  currency_id?: string;
  date_approved?: string;
  external_reference?: string;
  metadata?: { preapproval_id?: string };
};

export const traerPago = (id: string) => mp<Pago>(`/v1/payments/${id}`);
