import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { crearSuscripcion } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

/**
 * Genera el link de pago de un comercio.
 *
 * Lo pide el superadmin desde el panel y se le pasa al comerciante. No se manda
 * solo por mail todavía: primero hay que ver que el cobro funcione de punta a
 * punta con una tarjeta de prueba.
 */
export async function POST(req: Request) {
  await requireSuperAdmin();

  const { tenantId, monto } = (await req.json()) as { tenantId?: string; monto?: number };
  if (!tenantId || !monto) {
    return NextResponse.json({ ok: false, error: 'Falta el comercio o el monto' }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, ownerEmail: true, email: true },
  });
  if (!tenant) return NextResponse.json({ ok: false, error: 'Comercio no encontrado' }, { status: 404 });

  const email = tenant.ownerEmail ?? tenant.email;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: 'Ese comercio no tiene mail cargado: Mercado Pago lo necesita' },
      { status: 400 },
    );
  }

  const origen = new URL(req.url).origin;
  const pre = await crearSuscripcion({
    tenantId: tenant.id,
    nombreComercio: tenant.name,
    emailPagador: email,
    montoMensual: monto,
    volverA: `${origen}/app`,
  });

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, status: pre.status, mpPreapprovalId: pre.id, amount: monto },
    update: { status: pre.status, mpPreapprovalId: pre.id, amount: monto },
  });

  return NextResponse.json({ ok: true, link: pre.init_point, id: pre.id });
}
