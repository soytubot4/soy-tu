import { NextResponse } from 'next/server';
import { validApiKey } from '@/lib/api-key';
import { prisma } from '@/lib/prisma';
import { startTrial, TRIAL_DAYS } from '@/lib/subscriptions';
import { estadoDe } from '@/lib/billing-status';

export const dynamic = 'force-dynamic';

/**
 * Arranca la prueba de un producto para un comercio.
 *
 *   POST /api/v1/billing/:slug/trial   { product: 'soytucanje' }
 *
 * Lo llama el alta de cada producto, apenas se crea el comercio. La prueba dura
 * lo mismo en todas las plataformas y ese número vive acá, no repetido en cada
 * repo — que es como se termina con un producto dando 30 días y otro 7.
 *
 * Es idempotente: si el comercio ya tenía ese producto, no se le regala otra
 * prueba. Si no, alcanzaría con darse de baja y volver a anotarse para no pagar
 * nunca.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!validApiKey(req)) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const { product } = (await req.json().catch(() => ({}))) as { product?: string };
  if (!product) {
    return NextResponse.json({ ok: false, error: 'Falta el producto' }, { status: 400 });
  }

  const [tenant, prod] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug }, select: { id: true } }),
    prisma.billingProduct.findUnique({ where: { key: product }, select: { id: true } }),
  ]);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'Comercio no encontrado' }, { status: 404 });
  }
  if (!prod) {
    return NextResponse.json({ ok: false, error: `No existe el producto ${product}` }, { status: 404 });
  }

  await startTrial(tenant.id, prod.id);

  return NextResponse.json({
    ok: true,
    data: { dias: TRIAL_DAYS, ...(await estadoDe(slug)) },
  });
}
