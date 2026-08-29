import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSubscription } from '@/lib/mercadopago';
import { monthsOf, officialRate, toPesos } from '@/lib/billing';
import { log } from '@/lib/subscriptions';

export const dynamic = 'force-dynamic';

/**
 * Contrata un producto para un comercio y devuelve el link de pago.
 *
 * Es por producto: un comercio con soytuadmin y soytuturno tiene dos
 * suscripciones, cada una con su plan, su precio y su link.
 *
 * La suscripción se guarda ANTES de pedirle el link a Mercado Pago, porque su
 * `external_reference` tiene que ser el id de la nuestra: es lo único que
 * después permite saber cuál de los dos productos pagó el comercio.
 */
export async function POST(req: Request) {
  const admin = await requireSuperAdmin();

  const { tenantId, billingPeriodId } = (await req.json()) as {
    tenantId?: string;
    billingPeriodId?: string;
  };
  if (!tenantId || !billingPeriodId) {
    return NextResponse.json({ ok: false, error: 'Falta el comercio o el plan' }, { status: 400 });
  }

  const [tenant, periodo] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, ownerEmail: true, email: true },
    }),
    prisma.billingPeriod.findUnique({
      where: { id: billingPeriodId },
      include: { plan: { include: { product: true } } },
    }),
  ]);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'Comercio no encontrado' }, { status: 404 });
  }
  if (!periodo) {
    return NextResponse.json({ ok: false, error: 'Plan no encontrado' }, { status: 404 });
  }

  const email = tenant.ownerEmail ?? tenant.email;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: 'Ese comercio no tiene mail cargado: Mercado Pago lo necesita' },
      { status: 400 },
    );
  }

  // El precio se cotiza en dólares pero se cobra en pesos. La cotización se
  // busca ahora y se guarda con el cobro: sin eso no se puede explicar por qué a
  // dos comercios el mismo plan les salió distinto.
  const precio = Number(periodo.price);
  let cotizacion: number | null = null;
  let enPesos = precio;
  if (periodo.currency === 'USD') {
    try {
      cotizacion = await officialRate();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'No se pudo traer la cotización del dólar. Probá de nuevo.' },
        { status: 502 },
      );
    }
    enPesos = toPesos(precio, periodo.currency, cotizacion);
  }

  const producto = periodo.plan.product;
  const detalle = `${producto.name} ${periodo.plan.name}`;

  // Se crea (o se reusa) la fila antes de pedir el link, para tener su id.
  const sub = await prisma.subscription.upsert({
    where: { tenantId_productId: { tenantId: tenant.id, productId: producto.id } },
    create: {
      tenantId: tenant.id,
      productId: producto.id,
      billingPeriodId: periodo.id,
      status: 'pending',
      amount: precio,
      currency: periodo.currency,
      startedAt: new Date(),
    },
    update: { billingPeriodId: periodo.id, amount: precio, currency: periodo.currency },
  });

  const origen = new URL(req.url).origin;
  const pre = await createSubscription({
    subscriptionId: sub.id,
    nombreComercio: tenant.name,
    detalle,
    emailPagador: email,
    monto: enPesos,
    mesesPorCobro: monthsOf(periodo.period),
    volverA: `${origen}/app`,
  });

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: pre.status, mpPreapprovalId: pre.id, mpPayerEmail: pre.payer_email ?? email },
  });

  await log({
    tenantId: tenant.id,
    subscriptionId: sub.id,
    kind: 'plan-cambiado',
    description: `${detalle} · ${periodo.period.toLowerCase()} · ${periodo.currency} ${precio}${
      cotizacion ? ` (a $${enPesos}, dólar ${cotizacion})` : ''
    }`,
    data: { periodId: periodo.id, precio, currency: periodo.currency, cotizacion, enPesos },
    actorEmail: admin.email,
  });

  return NextResponse.json({
    ok: true,
    link: pre.init_point,
    id: pre.id,
    enPesos,
    cotizacion,
  });
}
