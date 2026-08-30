import { NextResponse } from 'next/server';
import { validApiKey } from '@/lib/api-key';
import { prisma } from '@/lib/prisma';
import { money, perMonth, PERIODS } from '@/lib/billing';

export const dynamic = 'force-dynamic';

/**
 * El catálogo de planes de un producto, sin comercio.
 *
 *   GET /api/v1/billing/plans?product=soytuturno
 *
 * Es el mismo que el de `/:slug/plans` pero para cuando todavía no hay comercio:
 * la landing, donde alguien está mirando cuánto sale antes de anotarse.
 *
 * Sigue pidiendo la API key porque lo consume la API del producto, no el
 * navegador. Que el precio sea público no significa que el endpoint lo sea — así
 * el catálogo se sirve desde un solo lado y no hay dos versiones del precio dando
 * vueltas.
 */
export async function GET(req: Request) {
  if (!validApiKey(req)) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const product = new URL(req.url).searchParams.get('product');
  if (!product) {
    return NextResponse.json({ ok: false, error: 'Falta el producto' }, { status: 400 });
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
