import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { money, perMonth, PERIODS } from '@/lib/billing';
import { NewProduct, ProductCard } from './product-card';

export const dynamic = 'force-dynamic';

/**
 * El catálogo de venta: qué se vende, en qué planes y a qué precio.
 *
 * Tres niveles, como en nubo: Producto → Plan → Período. El precio vive en el
 * período y no en el plan porque cambia con la frecuencia — pagar por trimestre
 * sale menos por mes, y si el precio estuviera en el plan habría que duplicar el
 * plan entero para cobrar trimestral.
 */
export default async function Products() {
  await requireSuperAdmin();

  const products = await prisma.billingProduct.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      plans: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { periods: { orderBy: { price: 'asc' } } },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <nav className="mb-6 flex gap-4 text-sm">
          <a href="/" className="text-muted transition-colors hover:text-fg">
            Comercios
          </a>
          <span className="font-medium">Productos y precios</span>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight">Productos y precios</h1>
        <p className="mt-2 text-muted">
          Qué vendés, en qué planes y a cuánto. Cada plan puede cobrarse mensual, trimestral,
          semestral o anual, con precio distinto en cada frecuencia.
        </p>
      </header>

      <div className="space-y-5">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={{
              id: p.id,
              key: p.key,
              name: p.name,
              description: p.description,
              active: p.active,
              plans: p.plans.map((pl) => ({
                id: pl.id,
                name: pl.name,
                features: pl.features,
                active: pl.active,
                periods: pl.periods.map((pe) => ({
                  id: pe.id,
                  period: pe.period,
                  price: Number(pe.price),
                  label: PERIODS.find((x) => x.key === pe.period)?.label ?? pe.period,
                  precio: money(Number(pe.price)),
                  porMes: money(perMonth(Number(pe.price), pe.period)),
                })),
              })),
            }}
          />
        ))}

        {!products.length && (
          <p className="rounded-xl border border-dashed border-line p-6 text-muted">
            Todavía no cargaste ningún producto.
          </p>
        )}
      </div>

      <div className="mt-8">
        <NewProduct />
      </div>
    </main>
  );
}
