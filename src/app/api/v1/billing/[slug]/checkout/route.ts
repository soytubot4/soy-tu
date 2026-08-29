import { NextResponse } from 'next/server';
import { validApiKey } from '@/lib/api-key';
import { prisma } from '@/lib/prisma';
import { backUrl, createSubscription } from '@/lib/mercadopago';
import { money, monthsOf, officialRate, toPesos } from '@/lib/billing';
import { log } from '@/lib/subscriptions';

export const dynamic = 'force-dynamic';

/**
 * Devuelve el link donde el comerciante carga la tarjeta.
 *
 *   POST /api/v1/billing/:slug/checkout   { product, periodId?, volverA? }
 *
 * Lo llama cada producto desde su propia pantalla de suscripción, así el
 * comerciante no tiene que entrar a otro sistema para pagar. La lógica de cobro
 * queda en un solo lado: si cada producto armara su propio preapproval, tendrías
 * cuatro implementaciones del mismo cobro y ninguna igual a la otra.
 *
 * La tarjeta NO se pide acá ni en el producto: Mercado Pago exige que se cargue
 * en su página. Nosotros solo devolvemos a dónde mandarlo.
 *
 * Sin `periodId` se toma el plan mensual más barato del producto, que es lo que
 * quiere el 90% de los casos — el que quiere otro lo elige en su pantalla.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!validApiKey(req)) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    product?: string;
    periodId?: string;
    volverA?: string;
  };
  if (!body.product) {
    return NextResponse.json({ ok: false, error: 'Falta el producto' }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, ownerEmail: true, email: true },
  });
  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'Comercio no encontrado' }, { status: 404 });
  }

  const email = tenant.ownerEmail ?? tenant.email;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: 'El comercio no tiene mail cargado: Mercado Pago lo necesita' },
      { status: 400 },
    );
  }

  const periodo = body.periodId
    ? await prisma.billingPeriod.findUnique({
        where: { id: body.periodId },
        include: { plan: { include: { product: true } } },
      })
    : await prisma.billingPeriod.findFirst({
        where: {
          active: true,
          period: 'MENSUAL',
          plan: { active: true, product: { key: body.product } },
        },
        orderBy: { price: 'asc' },
        include: { plan: { include: { product: true } } },
      });

  if (!periodo || periodo.plan.product.key !== body.product) {
    return NextResponse.json(
      { ok: false, error: `No hay un plan con precio cargado para ${body.product}` },
      { status: 404 },
    );
  }

  // Cotizado en dólares, cobrado en pesos al oficial del día. La cotización se
  // guarda con el acuerdo para poder explicar después por qué le salió eso.
  const precio = Number(periodo.price);
  let cotizacion: number | null = null;
  if (periodo.currency === 'USD') {
    try {
      cotizacion = await officialRate();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'No se pudo traer la cotización del dólar. Probá de nuevo.' },
        { status: 502 },
      );
    }
  }
  const enPesos = toPesos(precio, periodo.currency, cotizacion ?? 1);
  const producto = periodo.plan.product;

  const acuerdo = await prisma.$transaction(async (tx) => {
    const a = await tx.billingAgreement.create({
      data: {
        tenantId: tenant.id,
        status: 'pending',
        amount: enPesos,
        months: monthsOf(periodo.period),
        fxRate: cotizacion,
        mpPayerEmail: email,
        startedAt: new Date(),
      },
    });
    // La suscripción puede existir ya (viene de la prueba): se le engancha el
    // acuerdo en vez de crear una segunda para el mismo producto.
    await tx.subscription.upsert({
      where: { tenantId_productId: { tenantId: tenant.id, productId: producto.id } },
      create: {
        tenantId: tenant.id,
        productId: producto.id,
        billingPeriodId: periodo.id,
        agreementId: a.id,
        status: 'pending',
        amount: precio,
        currency: periodo.currency,
        startedAt: new Date(),
      },
      update: { billingPeriodId: periodo.id, agreementId: a.id, amount: precio, currency: periodo.currency },
    });
    return a;
  });

  let pre;
  try {
    pre = await createSubscription({
      subscriptionId: acuerdo.id,
      nombreComercio: tenant.name,
      detalle: `${producto.name} ${periodo.plan.name}`,
      emailPagador: email,
      monto: enPesos,
      mesesPorCobro: monthsOf(periodo.period),
      volverA: body.volverA ?? backUrl(new URL(req.url).origin),
    });
  } catch (e) {
    // Sin preapproval el acuerdo no sirve: se borra para que no quede figurando
    // como un débito que en realidad no existe.
    await prisma.billingAgreement.delete({ where: { id: acuerdo.id } }).catch(() => {});
    const msg = (e as Error).message;
    if (msg.includes('Payer and collector cannot be the same')) {
      return NextResponse.json(
        { ok: false, error: `${email} es la misma cuenta con la que cobrás. Cambiale el mail al comercio.` },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  await prisma.billingAgreement.update({
    where: { id: acuerdo.id },
    data: { status: pre.status, mpPreapprovalId: pre.id },
  });

  await log({
    tenantId: tenant.id,
    agreementId: acuerdo.id,
    kind: 'plan-cambiado',
    description: `Se generó el link de pago de ${producto.name} · ${money(enPesos)} cada ${
      monthsOf(periodo.period) === 1 ? 'mes' : `${monthsOf(periodo.period)} meses`
    }`,
    data: { desde: body.product, periodId: periodo.id, enPesos, cotizacion },
  });

  return NextResponse.json({
    ok: true,
    data: { link: pre.init_point, enPesos, cotizacion, plan: periodo.plan.name },
  });
}
