import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PRODUCTS } from '@/lib/products';

export const dynamic = 'force-dynamic';

const CLAVES = PRODUCTS.map((p) => p.key) as string[];

/**
 * Edita un comercio: nombre, si está activo y qué productos usa.
 *
 * Lo que NO se toca desde acá es el slug: es el subdominio por donde entran el
 * comercio y sus clientes, y cambiarlo les rompe los links guardados y las
 * sesiones abiertas. Eso se hace desde el producto, con más contexto.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    active?: boolean;
    enabledProducts?: string[];
  };

  const productos = body.enabledProducts?.filter((p) => CLAVES.includes(p));

  // soytuadmin y soytubar son el mismo producto para rubros distintos: tenerlos
  // juntos deja al comercio con dos sistemas de venta sobre el mismo stock.
  if (productos?.includes('soytuadmin') && productos.includes('soytubar')) {
    return NextResponse.json(
      { ok: false, error: 'Gestión y Bar no pueden estar juntos: son el mismo producto para rubros distintos' },
      { status: 400 },
    );
  }

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(productos ? { enabledProducts: productos } : {}),
    },
    select: { id: true, name: true, active: true, enabledProducts: true },
  });

  return NextResponse.json({ ok: true, data: tenant });
}

/**
 * Da de BAJA un comercio. No lo borra.
 *
 * Borrarlo se lleva puestas sus ventas, sus comprobantes y sus clientes en la
 * base compartida, y desde un panel que ve los cinco productos a la vez eso es
 * demasiado fácil de hacer sin querer. El borrado definitivo sigue en el
 * superadmin de cada producto, que muestra qué se está por destruir.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  await prisma.tenant.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
