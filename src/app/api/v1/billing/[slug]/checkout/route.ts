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
    /** Solo para productos que calculan su propio precio (soytuadmin). */
    monto?: number;
    meses?: number;
    detalle?: unknown;
  };
  if (!body.product) {
    return NextResponse.json({ ok: false, error: 'Falta el producto' }, { status: 400 });
  }

  // Un techo por las dudas: si un bug del producto manda un numero absurdo, es
  // mejor rechazarlo que generarle al comerciante un debito de esa plata.
  const TECHO = 2_000_000;
  if (body.monto != null) {
    if (!Number.isFinite(body.monto) || body.monto <= 0 || body.monto > TECHO) {
      return NextResponse.json(
        { ok: false, error: `El monto tiene que ser un numero entre 1 y ${TECHO}` },
        { status: 400 },
      );
    }
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

  // Dos formas de saber cuanto cobrar, y conviven:
  //
  //  - Precio de lista: el producto manda `periodId` (o ninguno y se toma el
  //    mensual mas barato). Es el caso de canje, turno, bar y cine.
  //  - Precio calculado: el producto manda `monto`. Es soytuadmin, que arma el
  //    precio sumando las features que tiene prendidas el comercio y por eso no
  //    puede tener un plan de lista.
  //
  // El monto solo se acepta de un producto autenticado con la API key, que es
  // servidor a servidor: nunca llega del navegador del comerciante.
  let producto: { id: string; name: string; key: string };
  let periodoId: string | null = null;
  let nombrePlan: string;
  let precio: number;
  let moneda = 'ARS';
  let cotizacion: number | null = null;
  let meses: number;

  if (body.monto != null) {
    const p = await prisma.billingProduct.findUnique({ where: { key: body.product } });
    if (!p) {
      return NextResponse.json(
        { ok: false, error: `No existe el producto ${body.product}` },
        { status: 404 },
      );
    }
    producto = p;
    precio = body.monto;
    // Los meses vienen del producto porque es el que sabe si vendio mensual o
    // anual; sin dato, mensual.
    meses = Number.isInteger(body.meses) && body.meses! > 0 ? body.meses! : 1;
    nombrePlan = 'a medida';
  } else {
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

    producto = periodo.plan.product;
    periodoId = periodo.id;
    nombrePlan = periodo.plan.name;
    precio = Number(periodo.price);
    moneda = periodo.currency;
    meses = monthsOf(periodo.period);
  }

  // Cotizado en dólares, cobrado en pesos al oficial del día. La cotización se
  // guarda con el acuerdo para poder explicar después por qué le salió eso.
  if (moneda === 'USD') {
    try {
      cotizacion = await officialRate();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'No se pudo traer la cotización del dólar. Probá de nuevo.' },
        { status: 502 },
      );
    }
  }
  const enPesos = toPesos(precio, moneda, cotizacion ?? 1);

  const acuerdo = await prisma.$transaction(async (tx) => {
    const a = await tx.billingAgreement.create({
      data: {
        tenantId: tenant.id,
        status: 'pending',
        amount: enPesos,
        months: meses,
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
        billingPeriodId: periodoId,
        agreementId: a.id,
        status: 'pending',
        amount: precio,
        currency: moneda,
        startedAt: new Date(),
      },
      update: { billingPeriodId: periodoId, agreementId: a.id, amount: precio, currency: moneda },
    });
    return a;
  });

  let pre;
  try {
    pre = await createSubscription({
      subscriptionId: acuerdo.id,
      nombreComercio: tenant.name,
      detalle: `${producto.name} ${nombrePlan}`,
      emailPagador: email,
      monto: enPesos,
      mesesPorCobro: meses,
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
      meses === 1 ? 'mes' : `${meses} meses`
    }`,
    // El detalle es lo que manda el producto explicando como armo el precio (que
    // features, a cuanto cada una). Es lo unico que despues permite contestarle a
    // un comerciante por que le cobraron eso.
    data: { desde: body.product, periodId: periodoId, enPesos, cotizacion, detalle: body.detalle ?? null },
  });

  return NextResponse.json({
    ok: true,
    data: { link: pre.init_point, enPesos, cotizacion, plan: nombrePlan },
  });
}
