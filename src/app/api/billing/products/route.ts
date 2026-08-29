import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await requireSuperAdmin();
  const b = (await req.json()) as { key?: string; name?: string; description?: string };
  if (!b.key || !b.name) {
    return NextResponse.json({ ok: false, error: 'Falta la clave o el nombre' }, { status: 400 });
  }
  // La clave se normaliza: tiene que coincidir con `tenants.enabled_products`,
  // que guarda 'soytuadmin' y no 'SoyTuAdmin'.
  const key = b.key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const existe = await prisma.billingProduct.findUnique({ where: { key }, select: { id: true } });
  if (existe) return NextResponse.json({ ok: false, error: 'Ya existe un producto con esa clave' }, { status: 400 });

  const p = await prisma.billingProduct.create({
    data: { key, name: b.name.trim(), description: b.description?.trim() || null },
  });
  return NextResponse.json({ ok: true, data: p });
}

export async function PATCH(req: Request) {
  await requireSuperAdmin();
  const b = (await req.json()) as { id?: string; name?: string; description?: string; active?: boolean };
  if (!b.id) return NextResponse.json({ ok: false, error: 'Falta el producto' }, { status: 400 });
  const p = await prisma.billingProduct.update({
    where: { id: b.id },
    data: {
      ...(b.name !== undefined ? { name: b.name.trim() } : {}),
      ...(b.description !== undefined ? { description: b.description.trim() || null } : {}),
      ...(b.active !== undefined ? { active: b.active } : {}),
    },
  });
  return NextResponse.json({ ok: true, data: p });
}
