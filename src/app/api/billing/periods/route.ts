import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENCIES, PERIODS } from '@/lib/billing';

export const dynamic = 'force-dynamic';

const CLAVES = PERIODS.map((p) => p.key) as string[];

export async function POST(req: Request) {
  await requireSuperAdmin();
  const b = (await req.json()) as {
    planId?: string;
    period?: string;
    price?: number;
    currency?: string;
    /** Solo lo manda la edición en el lugar. Sin esto, pisar un precio es un bug. */
    overwrite?: boolean;
  };
  if (!b.planId || !b.period || b.price == null) {
    return NextResponse.json({ ok: false, error: 'Falta el plan, la frecuencia o el precio' }, { status: 400 });
  }
  if (!CLAVES.includes(b.period)) {
    return NextResponse.json({ ok: false, error: 'Esa frecuencia no existe' }, { status: 400 });
  }
  const moneda = (CURRENCIES as readonly string[]).includes(b.currency ?? '') ? b.currency! : 'ARS';

  // Pisar un precio tiene que ser algo que se pidio a proposito. Cuando el alta
  // manda una frecuencia que ya existe es porque algo de la pantalla mando mal
  // el dato, y sobrescribir sin avisar se lleva puesto un precio cargado.
  if (!b.overwrite) {
    const ya = await prisma.billingPeriod.findUnique({
      where: { planId_period: { planId: b.planId, period: b.period } },
      select: { id: true },
    });
    if (ya) {
      return NextResponse.json(
        { ok: false, error: 'Ese plan ya tiene precio para esa frecuencia. Editalo desde la lista.' },
        { status: 400 },
      );
    }
  }

  const per = await prisma.billingPeriod.upsert({
    where: { planId_period: { planId: b.planId, period: b.period } },
    create: { planId: b.planId, period: b.period, price: b.price, currency: moneda },
    update: { price: b.price, currency: moneda, active: true },
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
