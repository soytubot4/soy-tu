import { NextResponse } from 'next/server';
import { validApiKey } from '@/lib/api-key';
import { estadoDe } from '@/lib/billing-status';

export const dynamic = 'force-dynamic';

/**
 * Estado de facturación de un comercio.
 *
 *   GET /api/v1/billing/:slug     (header x-api-key)
 *
 * Lo consultan los otros productos para saber si el comercio está al día, en
 * prueba o vencido. La cuenta la hace soytu y no cada producto: si soytucanje
 * calculara el vencimiento por su lado y soytuadmin por el suyo, el mismo
 * comercio vería dos verdades distintas según por dónde entre.
 *
 * El comercio sale del slug de la URL, no de un header: así un producto no puede
 * preguntar por otro comercio equivocándose de header.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!validApiKey(_req)) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const estado = await estadoDe(slug);
  if (!estado) {
    return NextResponse.json({ ok: false, error: 'Comercio no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: estado });
}
