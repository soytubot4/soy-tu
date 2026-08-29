import { prisma } from './prisma';
import { getPayment, getSubscription } from './mercadopago';

/** Un mes de prueba en todas las plataformas de soytu. */
export const TRIAL_DAYS = 30;

/**
 * Qué hacer con un comercio que no pagó.
 *
 * Arranca en 'avisar' A PROPÓSITO: cortarle el sistema a un comercio en medio de
 * un sábado a la noche es una decisión de negocio, no algo que deba pasar por
 * default. Cuando se decida, se cambia acá (o por env) y el panel lo respeta.
 *
 *   avisar        se marca vencido y se ve en el panel, pero sigue funcionando
 *   solo-lectura  puede ver sus datos, no cargar nuevos       (falta implementar)
 *   suspender     no entra hasta que pague                    (falta implementar)
 */
export const ON_UNPAID = (process.env.SOYTU_AL_NO_PAGAR ?? 'avisar') as
  | 'avisar'
  | 'solo-lectura'
  | 'suspender';

/** Días que se le siguen dando después de que falla un cobro. */
export const GRACE_DAYS = 5;

export type PaymentState = 'prueba' | 'al-dia' | 'por-vencer' | 'vencido' | 'sin-suscripcion';

/**
 * En qué está un comercio, mirando su suscripción.
 *
 * Se calcula acá y no se guarda un campo "vencido" porque el vencimiento depende
 * del paso del tiempo: un campo guardado estaría mintiendo hasta que algo lo
 * actualice.
 */
export function statusOf(sub: {
  status: string;
  paidUntil: Date | null;
} | null): PaymentState {
  if (!sub) return 'sin-suscripcion';

  const hasta = sub.paidUntil ? new Date(sub.paidUntil).getTime() : null;
  const ahora = Date.now();
  const vigente = hasta != null && hasta + GRACE_DAYS * 86_400_000 > ahora;

  if (sub.status === 'PRUEBA') return vigente ? 'prueba' : 'vencido';
  if (sub.status === 'authorized') {
    if (!vigente) return 'vencido';
    // Menos de una semana: se avisa antes de que se corte, no después.
    return hasta! - ahora < 7 * 86_400_000 ? 'por-vencer' : 'al-dia';
  }
  return 'vencido';
}

/** Arranca la prueba de un comercio que todavía no tiene suscripción. */
export async function startTrial(tenantId: string) {
  const hasta = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
  return prisma.subscription.upsert({
    where: { tenantId },
    create: { tenantId, status: 'PRUEBA', paidUntil: hasta },
    update: {},
  });
}

/**
 * Procesa un aviso de Mercado Payment.
 *
 * Mercado Payment manda solo el id y el tipo: hay que ir a buscar el detalle. Se
 * hace así a propósito de su lado — el webhook puede llegar duplicado, fuera de
 * orden o falsificado, y la fuente de verdad es siempre la consulta.
 */
export async function processNotification(tipo: string, id: string) {
  if (tipo === 'subscription_preapproval' || tipo === 'preapproval') {
    const pre = await getSubscription(id);
    const tenantId = pre.external_reference;
    if (!tenantId) return { ok: false, motivo: 'sin external_reference' };

    // Un mes más desde ahora. Mercado Payment no dice hasta cuándo pagó, así que la
    // fecha se lleva de este lado.
    const hasta =
      pre.status === 'authorized' ? new Date(Date.now() + 31 * 86_400_000) : undefined;

    await prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        status: pre.status,
        mpPreapprovalId: pre.id,
        mpPayerEmail: pre.payer_email,
        amount: pre.auto_recurring?.transaction_amount,
        paidUntil: hasta,
        lastEvent: pre as object,
        lastEventAt: new Date(),
      },
      update: {
        status: pre.status,
        mpPreapprovalId: pre.id,
        mpPayerEmail: pre.payer_email,
        amount: pre.auto_recurring?.transaction_amount,
        ...(hasta ? { paidUntil: hasta } : {}),
        lastEvent: pre as object,
        lastEventAt: new Date(),
      },
    });
    return { ok: true, tenantId, status: pre.status };
  }

  if (tipo === 'payment') {
    const pago = await getPayment(id);
    const tenantId = pago.external_reference;
    if (!tenantId) return { ok: false, motivo: 'sin external_reference' };

    // upsert por el id de Mercado Payment: el mismo aviso puede llegar dos veces y
    // no se puede contar el cobro dos veces.
    await prisma.subscriptionPayment.upsert({
      where: { mpPaymentId: String(pago.id) },
      create: {
        tenantId,
        mpPaymentId: String(pago.id),
        status: pago.status,
        amount: pago.transaction_amount,
        currency: pago.currency_id ?? 'ARS',
        paidAt: pago.date_approved ? new Date(pago.date_approved) : null,
        raw: pago as object,
      },
      update: { status: pago.status, raw: pago as object },
    });

    if (pago.status === 'approved') {
      await prisma.subscription.updateMany({
        where: { tenantId },
        data: { paidUntil: new Date(Date.now() + 31 * 86_400_000), status: 'authorized' },
      });
    }
    return { ok: true, tenantId, status: pago.status };
  }

  return { ok: false, motivo: `tipo no manejado: ${tipo}` };
}
