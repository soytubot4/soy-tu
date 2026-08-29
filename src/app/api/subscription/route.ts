import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { backUrl, createSubscription } from '@/lib/mercadopago';
import { money, monthsOf, officialRate, toPesos } from '@/lib/billing';
import { log } from '@/lib/subscriptions';

export const dynamic = 'force-dynamic';

/**
 * Contrata uno o varios productos y devuelve UN link de pago para todos.
 *
 * Un comercio con soytuadmin, soytucanje y soytuturno tiene tres suscripciones
 * —cada una con su plan y su precio— pero un solo débito por mes. Tres débitos
 * serían tres renglones en el resumen, tres cosas que pueden rebotar y tres
 * llamados cuando una rebota.
 *
 * Lo que agrupa es el acuerdo de cobro: se crea primero, porque el
 * `external_reference` del preapproval tiene que ser su id. Es lo único que
 * después permite saber qué cubrió un pago.
 */
export async function POST(req: Request) {
  const admin = await requireSuperAdmin();

  const body = (await req.json()) as { tenantId?: string; billingPeriodIds?: string[] };
  const { tenantId } = body;
  const ids = [...new Set(body.billingPeriodIds ?? [])];

  if (!tenantId || !ids.length) {
    return NextResponse.json({ ok: false, error: 'Falta el comercio o los planes' }, { status: 400 });
  }

  const [tenant, periodos] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, ownerEmail: true, email: true },
    }),
    prisma.billingPeriod.findMany({
      where: { id: { in: ids } },
      include: { plan: { include: { product: true } } },
    }),
  ]);

  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'Comercio no encontrado' }, { status: 404 });
  }
  if (periodos.length !== ids.length) {
    return NextResponse.json({ ok: false, error: 'Alguno de los planes no existe' }, { status: 404 });
  }

  // Un producto no se puede contratar dos veces en el mismo cobro: si no, no se
  // sabría cuál de los dos planes es el que tiene.
  const productos = periodos.map((p) => p.plan.productId);
  if (new Set(productos).size !== productos.length) {
    return NextResponse.json(
      { ok: false, error: 'Elegiste dos planes del mismo producto' },
      { status: 400 },
    );
  }

  // Mercado Pago cobra con UNA frecuencia por débito. Mezclar un mensual con un
  // anual en el mismo cobro le cobraría el año doce veces.
  const meses = [...new Set(periodos.map((p) => monthsOf(p.period)))];
  if (meses.length > 1) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Los planes tienen frecuencias distintas. Para cobrarlos juntos tienen que ser todos de la misma.',
      },
      { status: 400 },
    );
  }

  const email = tenant.ownerEmail ?? tenant.email;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: 'Ese comercio no tiene mail cargado: Mercado Pago lo necesita' },
      { status: 400 },
    );
  }

  // El precio se cotiza en dólares pero se cobra en pesos. La cotización se pide
  // una sola vez para todo el cobro: con dos llamadas podrían venir dos dólares
  // distintos y la suma no daría.
  let cotizacion: number | null = null;
  if (periodos.some((p) => p.currency === 'USD')) {
    try {
      cotizacion = await officialRate();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'No se pudo traer la cotización del dólar. Probá de nuevo.' },
        { status: 502 },
      );
    }
  }

  const enPesos = periodos.reduce(
    (s, p) => s + toPesos(Number(p.price), p.currency, cotizacion ?? 1),
    0,
  );

  const detalle = periodos.map((p) => `${p.plan.product.name} ${p.plan.name}`).join(' + ');

  // Todo junto: si algo falla, el comercio no queda con suscripciones a medias
  // apuntando a un acuerdo que no existe.
  const acuerdo = await prisma.$transaction(async (tx) => {
    const a = await tx.billingAgreement.create({
      data: {
        tenantId: tenant.id,
        status: 'pending',
        amount: enPesos,
        months: meses[0]!,
        fxRate: cotizacion,
        mpPayerEmail: email,
        startedAt: new Date(),
      },
    });

    for (const p of periodos) {
      await tx.subscription.upsert({
        where: { tenantId_productId: { tenantId: tenant.id, productId: p.plan.productId } },
        create: {
          tenantId: tenant.id,
          productId: p.plan.productId,
          billingPeriodId: p.id,
          agreementId: a.id,
          status: 'pending',
          amount: p.price,
          currency: p.currency,
          startedAt: new Date(),
        },
        update: {
          billingPeriodId: p.id,
          agreementId: a.id,
          amount: p.price,
          currency: p.currency,
        },
      });
    }
    return a;
  });

  let pre;
  try {
    pre = await createSubscription({
      subscriptionId: acuerdo.id,
      nombreComercio: tenant.name,
      detalle,
      emailPagador: email,
      monto: enPesos,
      mesesPorCobro: meses[0]!,
      volverA: backUrl(new URL(req.url).origin),
    });
  } catch (e) {
    // El acuerdo queda sin preapproval y no sirve para nada: se borra para que
    // no aparezca en la ficha como un débito que en realidad no existe.
    await prisma.billingAgreement.delete({ where: { id: acuerdo.id } }).catch(() => {});

    const msg = (e as Error).message;
    if (msg.includes('Payer and collector cannot be the same')) {
      return NextResponse.json(
        {
          ok: false,
          error: `${email} es la misma cuenta con la que cobrás en Mercado Pago, y nadie se puede cobrar a sí mismo. Cambiale el mail al comercio.`,
        },
        { status: 400 },
      );
    }
    if (msg.includes('back_url')) {
      return NextResponse.json(
        { ok: false, error: 'Mercado Pago rechazó la URL de vuelta. Revisá SOYTU_APP_URL.' },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  await prisma.billingAgreement.update({
    where: { id: acuerdo.id },
    data: { status: pre.status, mpPreapprovalId: pre.id, mpPayerEmail: pre.payer_email ?? email },
  });

  await log({
    tenantId: tenant.id,
    agreementId: acuerdo.id,
    kind: 'plan-cambiado',
    description: `${detalle} · ${money(enPesos)} cada ${
      meses[0] === 1 ? 'mes' : `${meses[0]} meses`
    }${cotizacion ? ` (dólar ${cotizacion})` : ''}`,
    data: { periodIds: ids, enPesos, cotizacion, meses: meses[0] },
    actorEmail: admin.email,
  });

  return NextResponse.json({ ok: true, link: pre.init_point, id: pre.id, enPesos, cotizacion });
}
