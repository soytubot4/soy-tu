import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PRODUCTS } from '@/lib/products';
import { LogoutButton } from './logout-button';
import { EditableRow } from './tenant-row';
import { ON_UNPAID, worstStatus, type PaymentState } from '@/lib/subscriptions';
import { isSandbox } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

const fecha = (d: Date) =>
  new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/**
 * Superadmin de soytu: los comercios de los cinco productos, en un solo lugar.
 *
 * Hoy solo LEE. Crear y editar sigue en el superadmin de cada producto, que es el
 * que sabe qué más hay que dejar armado al dar de alta (depósitos, listas de
 * precios, dominios). Duplicar eso acá sería tener dos lugares donde crear un
 * comercio, y se desincronizan solos.
 *
 * Lo que sí resuelve, y hoy no existe en ningún lado: ver el conjunto. Cuántos
 * comercios hay, qué producto usa cada uno y cuáles están dados de baja.
 */
export default async function Panel() {
  // Acá se ven los comercios, los dueños y los mails de TODOS los clientes: el
  // gate va primero que cualquier consulta.
  const admin = await requireSuperAdmin();

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    take: 500,
    include: {
      subscriptions: { select: { status: true, paidUntil: true, amount: true, currency: true } },
    },
  });

  const porProducto = PRODUCTS.map((p) => ({
    ...p,
    total: tenants.filter((t) => t.enabledProducts.includes(p.key) && t.active).length,
  }));
  const activos = tenants.filter((t) => t.active).length;
  const vencidos = tenants.filter((t) => worstStatus(t.subscriptions) === 'vencido').length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10">
        <nav className="mb-6 flex gap-4 text-sm">
          <span className="font-medium">Comercios</span>
          <a href="/products" className="text-muted transition-colors hover:text-fg">
            Productos y precios
          </a>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight">Comercios</h1>
        <p className="mt-2 text-muted">
          {activos} activos de {tenants.length} en total, en los cinco productos.
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {admin.fullName ?? admin.email} · <LogoutButton />
        </p>
        {vencidos > 0 && (
          <p className="mt-3 text-[13px] text-amber-500">
            {vencidos} {vencidos === 1 ? 'comercio vencido' : 'comercios vencidos'}
            {ON_UNPAID === 'avisar' && ' · siguen funcionando: hoy solo se avisa'}
          </p>
        )}
        {isSandbox() && (
          <p className="mt-1 text-[13px] text-amber-500">
            Mercado Payment está en modo prueba: los cobros no son reales.
          </p>
        )}
      </header>

      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-5">
        {porProducto.map((p) => (
          <div key={p.key} className="bg-bg px-5 py-6">
            <strong className="block text-2xl font-semibold tracking-tight tabular-nums">
              {p.total}
            </strong>
            <span className="text-[13px] text-muted">{p.nombre}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[13px] text-muted">
              <th className="px-4 py-3 font-medium">Comercio</th>
              <th className="px-4 py-3 font-medium">Productos</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Dueño</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <EditableRow key={t.id} t={t}>
                <td className="px-4 py-3">
                  <a href={`/tenants/${t.id}`} className="block font-medium hover:underline">
                    {t.name}
                  </a>
                  <span className="text-[13px] text-muted">
                    {t.slug}
                    {!t.active && ' · dado de baja'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1">
                    {PRODUCTS.filter((p) => t.enabledProducts.includes(p.key)).map((p) => (
                      <span
                        key={p.key}
                        className="rounded-full border border-line-strong px-2 py-0.5 text-[11px]"
                      >
                        {p.nombre}
                      </span>
                    ))}
                    {!t.enabledProducts.length && <span className="text-[13px] text-muted">—</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PaymentStatus
                    estado={worstStatus(t.subscriptions)}
                    hasta={proximoVencimiento(t.subscriptions)}
                  />
                </td>
                <td className="px-4 py-3 text-muted">{t.ownerEmail ?? t.email ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums text-muted">{fecha(t.createdAt)}</td>
              </EditableRow>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const STATUS_LABELS: Record<PaymentState, { texto: string; clase: string }> = {
  'al-dia': { texto: 'Al día', clase: 'text-emerald-500' },
  'por-vencer': { texto: 'Por vencer', clase: 'text-amber-500' },
  prueba: { texto: 'En prueba', clase: 'text-muted' },
  vencido: { texto: 'Vencido', clase: 'text-red-500' },
  'sin-suscripcion': { texto: 'Sin suscripción', clase: 'text-muted' },
};

/** La fecha que primero se vence: es la que hay que mirar. */
function proximoVencimiento(subs: { paidUntil: Date | null }[]): Date | null {
  const fechas = subs.map((s) => s.paidUntil).filter((d): d is Date => !!d);
  if (!fechas.length) return null;
  return fechas.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
}

/** El estado de pago, con la fecha cuando la hay: "vencido" sin fecha no sirve. */
function PaymentStatus({ estado, hasta }: { estado: PaymentState; hasta: Date | null }) {
  const e = STATUS_LABELS[estado];
  return (
    <span>
      <span className={`block text-[13px] font-medium ${e.clase}`}>{e.texto}</span>
      {hasta && (
        <span className="text-[11px] text-muted tabular-nums">
          {new Date(hasta).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </span>
      )}
    </span>
  );
}
