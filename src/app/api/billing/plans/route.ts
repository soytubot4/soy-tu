import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await requireSuperAdmin();
  const b = (await req.json()) as { productId?: string; name?: string; features?: string[] };
  if (!b.productId || !b.name) {
    return NextResponse.json({ ok: false, error: 'Falta el producto o el nombre' }, { status: 400 });
  }
  const plan = await prisma.billingPlan.create({
    data: {
      productId: b.productId,
      name: b.name.trim(),
      features: (b.features ?? []).map((f) => f.trim()).filter(Boolean),
    },
  });
  return NextResponse.json({ ok: true, data: plan });
}

export async function PATCH(req: Request) {
  await requireSuperAdmin();
  const b = (await req.json()) as { id?: string; name?: string; features?: string[]; active?: boolean };
  if (!b.id) return NextResponse.json({ ok: false, error: 'Falta el plan' }, { status: 400 });
  const plan = await prisma.billingPlan.update({
    where: { id: b.id },
    data: {
      ...(b.name !== undefined ? { name: b.name.trim() } : {}),
      ...(b.features !== undefined ? { features: b.features.map((f) => f.trim()).filter(Boolean) } : {}),
      ...(b.active !== undefined ? { active: b.active } : {}),
    },
  });
  return NextResponse.json({ ok: true, data: plan });
}

export async function DELETE(req: Request) {
  await requireSuperAdmin();
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ ok: false, error: 'Falta el plan' }, { status: 400 });

  // Si hay comercios pagando este plan, no se borra: quedarian sin precio y sin
  // saber que estaban pagando.
  const enUso = await prisma.subscription.count({ where: { billingPeriod: { planId: id } } });
  if (enUso) {
    return NextResponse.json(
      { ok: false, error: `Hay ${enUso} comercio(s) con este plan. Desactivalo en vez de borrarlo.` },
      { status: 400 },
    );
  }
  await prisma.billingPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
