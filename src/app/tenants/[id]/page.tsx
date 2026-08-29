import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { money } from '@/lib/billing';
import { PRODUCTS } from '@/lib/products';
import { statusOf, worstStatus, type PaymentState } from '@/lib/subscriptions';
import { Contratar, Nota } from './acciones';

export const dynamic = 'force-dynamic';

const fecha = (d: Date | string) =>
  new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fechaHora = (d: Date | string) =>
  new Date(d).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const ESTADOS: Record<PaymentState, { texto: string; clase: string }> = {
  'al-dia': { texto: 'Al día', clase: 'text-emerald-500' },
  'por-vencer': { texto: 'Por vencer', clase: 'text-amber-500' },
  prueba: { texto: 'En prueba', clase: 'text-muted' },
  vencido: { texto: 'Vencido', clase: 'text-red-500' },
  'sin-suscripcion': { texto: 'Sin contratar', clase: 'text-muted' },
};

/** Cómo se ve cada estado de cobro que manda Mercado Pago. */
const PAGOS: Record<string, { texto: string; clase: string }> = {
  approved: { texto: 'Aprobado', clase: 'text-emerald-500' },
  pending: { texto: 'Pendiente', clase: 'text-amber-500' },
  in_process: { texto: 'En proceso', clase: 'text-amber-500' },
  rejected: { texto: 'Rechazado', clase: 'text-red-500' },
  cancelled: { texto: 'Cancelado', clase: 'text-muted' },
  refunded: { texto: 'Devuelto', clase: 'text-muted' },
  charged_back: { texto: 'Contracargo', clase: 'text-red-500' },
};

/**
 * La ficha de un comercio: qué contrató, qué pagó y qué le pasó.
 *
 * Es la pantalla a la que se entra cuando un comercio llama preguntando por un
 * cobro. Por eso las tres cosas están juntas y en este orden: primero qué está
 * pagando hoy, después la plata que entró, y al final el detalle de qué fue
 * cambiando. Las tres separadas en pantallas distintas obligarían a reconstruir
 * la historia a mano mientras el tipo espera en el teléfono.
 */
export default async function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      subscriptions: {
        include: {
          product: true,
          billingPeriod: { include: { plan: true } },
          agreement: true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { subscription: { include: { product: true } } },
      },
      logs: { orderBy: { createdAt: 'desc' }, take: 60 },
    },
  });
  if (!tenant) notFound();

  // Los planes se cargan una vez para todos los selectores de la pantalla.
  const catalogo = await prisma.billingProduct.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      plans: {
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { periods: { where: { active: true }, orderBy: { price: 'asc' } } },
      },
    },
  });

  const cobrado = tenant.payments
    .filter((p) => p.status === 'approved')
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const estado = worstStatus(tenant.subscriptions);

  /**
   * Las suscripciones agrupadas por el débito que las paga.
   *
   * Las que todavía no tienen acuerdo (las que están en prueba) van cada una por
   * su lado: no hay un débito que las junte.
   */
  const debitos = Object.values(
    tenant.subscriptions.reduce<
      Record<
        string,
        {
          key: string;
          status: string;
          paidUntil: Date | null;
          amount: number | null;
          months: number;
          fxRate: number | null;
          mpPreapprovalId: string | null;
          subs: typeof tenant.subscriptions;
        }
      >
    >((acc, s) => {
      const key = s.agreementId ?? `sola:${s.id}`;
      acc[key] ??= {
        key,
        status: s.agreement?.status ?? s.status,
        paidUntil: s.agreement?.paidUntil ?? s.paidUntil,
        amount: s.agreement ? Number(s.agreement.amount) : s.amount ? Number(s.amount) : null,
        months: s.agreement?.months ?? 1,
        fxRate: s.agreement?.fxRate ? Number(s.agreement.fxRate) : null,
        mpPreapprovalId: s.agreement?.mpPreapprovalId ?? null,
        subs: [],
      };
      acc[key].subs.push(s);
      return acc;
    }, {}),
  );

  // Productos que usa pero que no tiene contratados: es la plata que se está
  // dejando sobre la mesa, así que se muestra, no se esconde.
  const sinContratar = tenant.enabledProducts.filter(
    (k) => !tenant.subscriptions.some((s) => s.product?.key === k),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="mb-6 flex gap-4 text-sm">
        <a href="/app" className="text-muted transition-colors hover:text-fg">
          ← Comercios
        </a>
        <a href="/products" className="text-muted transition-colors hover:text-fg">
          Productos y precios
        </a>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{tenant.name}</h1>
        <p className="mt-2 text-muted">
          {tenant.slug}
          {!tenant.active && ' · dado de baja'}
          {' · alta '}
          {fecha(tenant.createdAt)}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {tenant.ownerName ?? '—'} · {tenant.ownerEmail ?? tenant.email ?? 'sin mail'}
          {tenant.phone && ` · ${tenant.phone}`}
        </p>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
        <Dato titulo="Estado" valor={ESTADOS[estado].texto} clase={ESTADOS[estado].clase} />
        <Dato titulo="Productos" valor={String(tenant.subscriptions.length)} />
        <Dato titulo="Cobrado" valor={money(cobrado)} />
        <Dato
          titulo="Pagos"
          valor={String(tenant.payments.filter((p) => p.status === 'approved').length)}
        />
      </div>

      {/* ── qué está pagando ─────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Qué tiene contratado</h2>

        {!tenant.subscriptions.length && (
          <p className="rounded-xl border border-dashed border-line p-6 text-muted">
            Todavía no contrató nada. Armale el cobro abajo.
          </p>
        )}

        {/* Agrupado por débito y no por producto: lo que se le cobra al comercio
            es un renglón en su resumen, no tres. */}
        <div className="space-y-3">
          {debitos.map((d) => {
            const e = statusOf(d);
            return (
              <div key={d.key} className="rounded-xl border border-line p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {d.amount != null ? money(Number(d.amount)) : 'Sin precio'}
                      <span className="text-muted">
                        {' '}
                        cada {d.months === 1 ? 'mes' : `${d.months} meses`}
                      </span>
                    </p>
                    <ul className="mt-1 text-[13px] text-muted">
                      {d.subs.map((s) => (
                        <li key={s.id}>
                          {s.product?.name ?? 'Producto borrado'}
                          {s.billingPeriod && ` · ${s.billingPeriod.plan.name}`}
                          {s.amount != null && ` · ${money(Number(s.amount), s.currency)}`}
                        </li>
                      ))}
                    </ul>
                    {d.fxRate && (
                      <p className="mt-1 text-[11px] text-muted">
                        armado con el dólar a {Number(d.fxRate)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[13px] font-medium ${ESTADOS[e].clase}`}>{ESTADOS[e].texto}</p>
                    {d.paidUntil && (
                      <p className="text-[11px] tabular-nums text-muted">
                        hasta {fecha(d.paidUntil)}
                      </p>
                    )}
                    {d.mpPreapprovalId && (
                      <p className="text-[11px] text-muted">débito automático</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!!sinContratar.length && (
          <p className="mt-3 text-[13px] text-amber-500">
            Usa {sinContratar.map((k) => PRODUCTS.find((p) => p.key === k)?.nombre ?? k).join(', ')}{' '}
            sin tener {sinContratar.length === 1 ? 'la suscripción' : 'las suscripciones'}.
          </p>
        )}

        <div className="mt-4 rounded-xl border border-line p-5">
          <p className="mb-3 text-[13px] font-medium">
            {tenant.subscriptions.length ? 'Cambiar el cobro' : 'Armar el cobro'}
          </p>
          <Contratar
            tenantId={tenant.id}
            catalogo={catalogo.map(plano)}
            actuales={Object.fromEntries(
              tenant.subscriptions
                .filter((s) => s.product && s.billingPeriodId)
                .map((s) => [s.product!.key, s.billingPeriodId!]),
            )}
          />
        </div>
      </section>

      {/* ── la plata ─────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Historial de pagos</h2>
        {!tenant.payments.length ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-muted">
            Todavía no hay cobros registrados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[13px] text-muted">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Qué cubrió</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Mercado Pago</th>
                </tr>
              </thead>
              <tbody>
                {tenant.payments.map((p) => {
                  const e = PAGOS[p.status] ?? { texto: p.status, clase: 'text-muted' };
                  return (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {fecha(p.paidAt ?? p.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {p.description || p.subscription?.product?.name || '—'}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {money(Number(p.amount ?? 0), p.currency)}
                        {p.fxRate && (
                          <span className="block text-[11px] text-muted">
                            dólar {Number(p.fxRate)}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-[13px] font-medium ${e.clase}`}>{e.texto}</td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-muted">
                        {p.mpPaymentId ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── qué pasó ─────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Actividad</h2>
          <Nota tenantId={tenant.id} />
        </div>
        {!tenant.logs.length ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-muted">
            Sin movimientos todavía.
          </p>
        ) : (
          <ul className="space-y-px overflow-hidden rounded-xl border border-line">
            {tenant.logs.map((l) => (
              <li key={l.id} className="flex flex-wrap gap-x-3 border-b border-line px-4 py-3 text-sm last:border-0">
                <span className="w-28 shrink-0 tabular-nums text-[13px] text-muted">
                  {fechaHora(l.createdAt)}
                </span>
                <span className="min-w-0 flex-1">{l.description}</span>
                {/* Sin actor lo hizo Mercado Pago, no una persona. */}
                <span className="text-[13px] text-muted">{l.actorEmail ?? 'Mercado Pago'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Dato({ titulo, valor, clase }: { titulo: string; valor: string; clase?: string }) {
  return (
    <div className="bg-bg px-5 py-6">
      <strong className={`block text-2xl font-semibold tracking-tight tabular-nums ${clase ?? ''}`}>
        {valor}
      </strong>
      <span className="text-[13px] text-muted">{titulo}</span>
    </div>
  );
}

/** Aplana el catálogo a lo que necesita el selector, sin los Decimal de Prisma. */
function plano(p: {
  id: string;
  key: string;
  name: string;
  plans: { id: string; name: string; periods: { id: string; period: string; price: unknown; currency: string }[] }[];
}) {
  return {
    id: p.id,
    key: p.key,
    name: p.name,
    plans: p.plans.map((pl) => ({
      id: pl.id,
      name: pl.name,
      periods: pl.periods.map((pe) => ({
        id: pe.id,
        period: pe.period,
        price: Number(pe.price),
        currency: pe.currency,
      })),
    })),
  };
}
