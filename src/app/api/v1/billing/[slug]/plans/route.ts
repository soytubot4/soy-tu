import { NextResponse } from 'next/server';
import { validApiKey } from '@/lib/api-key';
import { prisma } from '@/lib/prisma';
import { money, perMonth, PERIODS } from '@/lib/billing';

export const dynamic = 'force-dynamic';

/**
 * Los planes que el comercio puede contratar de un producto.
 *
 *   GET /api/v1/billing/:slug/plans?product=soytuadmin
 *
 * Existe para que cada producto pueda ofrecer sus planes en su propia pantalla
 * —soytuadmin puede tener varios según el tipo de negocio— sin tener que saber
 * los precios.
 *
 * El producto elige un `periodId` y se lo pasa al checkout. NUNCA manda el monto:
 * si lo mandara, cada producto podría cobrar lo que quisiera y el precio dejaría
 * de ser verificable contra el catálogo. El id se resuelve del lado de acá.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!validApiKey(req)) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const product = new URL(req.url).searchParams.get('product');
  if (!product) {
    return NextResponse.json({ ok: false, error: 'Falta el producto' }, { status: 400 });
  }

  const existe = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!existe) {
    return NextResponse.json({ ok: false, error: 'Comercio no encontrado' }, { status: 404 });
  }

  const planes = await prisma.billingPlan.findMany({
    where: { active: true, product: { key: product, active: true } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { periods: { where: { active: true }, orderBy: { price: 'asc' } } },
  });

  return NextResponse.json({
    ok: true,
    data: planes.map((p) => ({
      id: p.id,
      nombre: p.name,
      descripcion: p.description,
      incluye: p.features,
      periodos: p.periods.map((pe) => ({
        // Esto es lo que el producto manda al checkout.
        id: pe.id,
        frecuencia: pe.period,
        label: PERIODS.find((x) => x.key === pe.period)?.label ?? pe.period,
        precio: money(Number(pe.price), pe.currency),
        porMes: money(perMonth(Number(pe.price), pe.period), pe.currency),
        moneda: pe.currency,
      })),
    })),
  });
}
