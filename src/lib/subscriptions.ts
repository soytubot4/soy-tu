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

/**
 * El estado del comercio entero, que es el peor de sus productos.
 *
 * Si paga soytuadmin pero le vencio soytuturno, el comercio esta vencido: lo que
 * hay que ver de un vistazo en la lista es si hay algo para reclamar, no un
 * promedio que esconda al que dejo de pagar.
 */
const PRIORIDAD: PaymentState[] = [
  'vencido',
  'por-vencer',
  'prueba',
  'al-dia',
  'sin-suscripcion',
];

export function worstStatus(subs: { status: string; paidUntil: Date | null }[]): PaymentState {
  if (!subs.length) return 'sin-suscripcion';
  const estados = subs.map((s) => statusOf(s));
  return PRIORIDAD.find((p) => estados.includes(p)) ?? 'sin-suscripcion';
}

/** Deja anotado que paso algo con una suscripcion. */
export function log(params: {
  tenantId: string;
  subscriptionId?: string | null;
  agreementId?: string | null;
  kind: string;
  description: string;
  data?: object;
  actorEmail?: string | null;
}) {
  return prisma.subscriptionLog.create({
    data: {
      tenantId: params.tenantId,
      subscriptionId: params.subscriptionId ?? null,
      agreementId: params.agreementId ?? null,
      kind: params.kind,
      description: params.description,
      data: (params.data ?? undefined) as never,
      actorEmail: params.actorEmail ?? null,
    },
  });
}

/** Arranca la prueba de un producto que el comercio todavia no tiene contratado. */
export async function startTrial(tenantId: string, productId: string, actorEmail?: string) {
  const hasta = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
  const ya = await prisma.subscription.findUnique({
    where: { tenantId_productId: { tenantId, productId } },
    select: { id: true },
  });
  if (ya) return ya;

  const sub = await prisma.subscription.create({
    data: {
      tenantId,
      productId,
      status: 'PRUEBA',
      paidUntil: hasta,
      startedAt: new Date(),
      trialEndsAt: hasta,
    },
  });
  await log({
    tenantId,
    subscriptionId: sub.id,
    kind: 'creada',
    description: `Empezo la prueba de ${TRIAL_DAYS} dias`,
    actorEmail,
  });
  return sub;
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
    // `external_reference` es el id del acuerdo de cobro: identifica al comercio
    // y a todos los productos que ese débito cubre.
    const acuerdo = await buscar(pre.external_reference, pre.id);
    if (!acuerdo) return { ok: false, motivo: 'no se pudo cruzar con un acuerdo' };

    // Un mes más desde ahora. Mercado Payment no dice hasta cuándo pagó, así que la
    // fecha se lleva de este lado.
    const hasta =
      pre.status === 'authorized'
        ? new Date(Date.now() + acuerdo.months * 31 * 86_400_000)
        : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.billingAgreement.update({
        where: { id: acuerdo.id },
        data: {
          status: pre.status,
          mpPayerEmail: pre.payer_email,
          ...(hasta ? { paidUntil: hasta } : {}),
          ...(pre.status === 'cancelled' ? { cancelledAt: new Date() } : {}),
          lastEvent: pre as object,
          lastEventAt: new Date(),
        },
      });
      // El estado lo dicta el acuerdo: todo lo que cubre ese débito se paga o no
      // se paga junto.
      await tx.subscription.updateMany({
        where: { agreementId: acuerdo.id },
        data: {
          status: pre.status,
          ...(hasta ? { paidUntil: hasta } : {}),
          ...(pre.status === 'cancelled' ? { cancelledAt: new Date() } : {}),
        },
      });
    });

    // Solo se anota cuando cambia: Mercado Pago reenvia el mismo aviso varias
    // veces y el historial quedaria lleno de renglones identicos.
    if (pre.status !== acuerdo.status) {
      await log({
        tenantId: acuerdo.tenantId,
        agreementId: acuerdo.id,
        kind:
          pre.status === 'cancelled' ? 'cancelada' : pre.status === 'paused' ? 'pausada' : 'creada',
        description: `Mercado Pago pasó el débito a "${pre.status}"`,
        data: { antes: acuerdo.status, ahora: pre.status },
      });
    }
    return { ok: true, tenantId: acuerdo.tenantId, status: pre.status };
  }

  if (tipo === 'payment') {
    const pago = await getPayment(id);
    const acuerdo = await buscar(pago.external_reference, pago.metadata?.preapproval_id);
    if (!acuerdo) return { ok: false, motivo: 'no se pudo cruzar con un acuerdo' };

    // Si ya estaba registrado no se vuelve a anotar: Mercado Pago reenvia el
    // mismo aviso y el cobro se contaria dos veces.
    const yaEstaba = await prisma.subscriptionPayment.findUnique({
      where: { mpPaymentId: String(pago.id) },
      select: { id: true, status: true },
    });

    const datos = {
      tenantId: acuerdo.tenantId,
      agreementId: acuerdo.id,
      status: pago.status,
      amount: pago.transaction_amount,
      currency: pago.currency_id ?? 'ARS',
      paidAt: pago.date_approved ? new Date(pago.date_approved) : null,
      fxRate: acuerdo.fxRate,
      description: acuerdo.subscriptions
        .map((s) => s.product?.name)
        .filter(Boolean)
        .join(' + '),
      raw: pago as object,
    };

    // upsert por el id de Mercado Payment: el mismo aviso puede llegar dos veces y
    // no se puede contar el cobro dos veces.
    await prisma.subscriptionPayment.upsert({
      where: { mpPaymentId: String(pago.id) },
      create: { ...datos, mpPaymentId: String(pago.id) },
      update: datos,
    });

    if (pago.status === 'approved') {
      const hasta = new Date(Date.now() + acuerdo.months * 31 * 86_400_000);
      await prisma.$transaction([
        prisma.billingAgreement.update({
          where: { id: acuerdo.id },
          data: { paidUntil: hasta, status: 'authorized' },
        }),
        prisma.subscription.updateMany({
          where: { agreementId: acuerdo.id },
          data: { paidUntil: hasta, status: 'authorized' },
        }),
      ]);
    }

    if (yaEstaba?.status !== pago.status) {
      await log({
        tenantId: acuerdo.tenantId,
        agreementId: acuerdo.id,
        kind: pago.status === 'approved' ? 'pago' : 'pago-rechazado',
        description:
          pago.status === 'approved'
            ? `Cobro aprobado por $${pago.transaction_amount}${datos.description ? ` · ${datos.description}` : ''}`
            : `Cobro ${pago.status} por $${pago.transaction_amount}`,
        data: { mpPaymentId: String(pago.id), status: pago.status },
      });
    }
    return { ok: true, tenantId: acuerdo.tenantId, status: pago.status };
  }

  return { ok: false, motivo: `tipo no manejado: ${tipo}` };
}

/**
 * Encuentra el acuerdo de cobro de un aviso.
 *
 * Primero por `external_reference`, que es lo que mandamos nosotros. Si no vino
 * (los avisos de pago sueltos a veces no lo traen) se cae al id de preapproval,
 * que quedo guardado al contratar.
 */
async function buscar(externalRef?: string, preapprovalId?: string) {
  const incluir = {
    subscriptions: { include: { product: { select: { name: true } } } },
  } as const;

  if (externalRef) {
    const a = await prisma.billingAgreement.findUnique({
      where: { id: externalRef },
      include: incluir,
    });
    if (a) return a;
  }
  if (preapprovalId) {
    return prisma.billingAgreement.findUnique({
      where: { mpPreapprovalId: preapprovalId },
      include: incluir,
    });
  }
  return null;
}
