import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERIODS } from '@/lib/billing';

export const dynamic = 'force-dynamic';

const CLAVES = PERIODS.map((p) => p.key) as string[];

export async function POST(req: Request) {
  await requireSuperAdmin();
  const b = (await req.json()) as { planId?: string; period?: string; price?: number };
  if (!b.planId || !b.period || b.price == null) {
    return NextResponse.json({ ok: false, error: 'Falta el plan, la frecuencia o el precio' }, { status: 400 });
  }
  if (!CLAVES.includes(b.period)) {
    return NextResponse.json({ ok: false, error: 'Esa frecuencia no existe' }, { status: 400 });
  }
  // upsert: cargar dos veces el mismo período es corregir el precio, no crear
  // un duplicado que despues nadie sabe cual vale.
  const per = await prisma.billingPeriod.upsert({
    where: { planId_period: { planId: b.planId, period: b.period } },
    create: { planId: b.planId, period: b.period, price: b.price },
    update: { price: b.price, active: true },
  });
  return NextResponse.json({ ok: true, data: per });
}

export async function DELETE(req: Request) {
  await requireSuperAdmin();
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ ok: false, error: 'Falta el período' }, { status: 400 });

  const enUso = await prisma.subscription.count({ where: { billingPeriodId: id } });
  if (enUso) {
    return NextResponse.json(
      { ok: false, error: `Hay ${enUso} comercio(s) pagando esta frecuencia.` },
      { status: 400 },
    );
  }
  await prisma.billingPeriod.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
