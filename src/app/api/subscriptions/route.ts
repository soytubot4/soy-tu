import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/subscriptions';

export const dynamic = 'force-dynamic';

/** Anota algo a mano en el historial de un comercio. */
export async function POST(req: Request) {
  const admin = await requireSuperAdmin();
  const b = (await req.json()) as {
    tenantId?: string;
    subscriptionId?: string;
    description?: string;
  };
  if (!b.tenantId || !b.description?.trim()) {
    return NextResponse.json({ ok: false, error: 'Falta el comercio o el texto' }, { status: 400 });
  }

  const existe = await prisma.tenant.findUnique({ where: { id: b.tenantId }, select: { id: true } });
  if (!existe) {
    return NextResponse.json({ ok: false, error: 'Comercio no encontrado' }, { status: 404 });
  }

  const nota = await log({
    tenantId: b.tenantId,
    subscriptionId: b.subscriptionId ?? null,
    kind: 'nota',
    description: b.description.trim(),
    actorEmail: admin.email,
  });
  return NextResponse.json({ ok: true, data: nota });
}

/**
 * Pausa o reactiva una suscripción a mano.
 *
 * No toca Mercado Pago: sirve para el caso de un comercio que arregló pagar por
 * fuera, o al que se le da unos días más. Cancelar el débito automático se hace
 * del lado de Mercado Pago.
 */
export async function PATCH(req: Request) {
  const admin = await requireSuperAdmin();
  const b = (await req.json()) as { id?: string; status?: string; paidUntil?: string };
  if (!b.id) return NextResponse.json({ ok: false, error: 'Falta la suscripción' }, { status: 400 });

  const sub = await prisma.subscription.findUnique({
    where: { id: b.id },
    select: { id: true, tenantId: true, status: true },
  });
  if (!sub) {
    return NextResponse.json({ ok: false, error: 'Suscripción no encontrada' }, { status: 404 });
  }

  const actualizada = await prisma.subscription.update({
    where: { id: b.id },
    data: {
      ...(b.status ? { status: b.status } : {}),
      ...(b.paidUntil ? { paidUntil: new Date(b.paidUntil) } : {}),
      ...(b.status === 'cancelled' ? { cancelledAt: new Date() } : {}),
    },
  });

  await log({
    tenantId: sub.tenantId,
    subscriptionId: sub.id,
    kind: b.status === 'cancelled' ? 'cancelada' : b.status === 'paused' ? 'pausada' : 'nota',
    description: b.status
      ? `Se pasó a mano de "${sub.status}" a "${b.status}"`
      : `Se cambió a mano la fecha de vencimiento`,
    data: { antes: sub.status, ahora: b.status ?? sub.status },
    actorEmail: admin.email,
  });

  return NextResponse.json({ ok: true, data: actualizada });
}
