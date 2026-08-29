import { prisma } from './prisma';
import { statusOf, worstStatus, type PaymentState } from './subscriptions';
import { money } from './billing';

/**
 * El estado de facturación de un comercio, en la forma en que lo necesitan los
 * otros productos.
 *
 * Se arma acá y no en cada producto para que todos digan lo mismo: si soytucanje
 * calcula "vencido" con una regla y soytuadmin con otra, el mismo comercio ve
 * dos verdades distintas según por dónde entre.
 */
export type EstadoFacturacion = {
  slug: string;
  nombre: string;
  activo: boolean;
  /** El peor estado de todo lo que tiene contratado. */
  estado: PaymentState;
  /** Si puede seguir usando el sistema. */
  puedeUsar: boolean;
  productos: {
    key: string;
    nombre: string;
    estado: PaymentState;
    plan: string | null;
    precio: string | null;
    hasta: string | null;
    enPrueba: boolean;
    tieneDebito: boolean;
  }[];
};

/**
 * Qué se hace con el que no pagó. Igual que en el panel: hoy solo se avisa.
 *
 * Se lee acá y no en cada producto porque es una decisión de negocio, y tenerla
 * repetida en cinco repos garantiza que algún día no coincidan.
 */
const AL_NO_PAGAR = process.env.SOYTU_AL_NO_PAGAR ?? 'avisar';

export async function estadoDe(slug: string): Promise<EstadoFacturacion | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      subscriptions: {
        include: {
          product: true,
          agreement: true,
          billingPeriod: { include: { plan: true } },
        },
      },
    },
  });
  if (!tenant) return null;

  const estado = worstStatus(tenant.subscriptions);

  return {
    slug: tenant.slug,
    nombre: tenant.name,
    activo: tenant.active,
    estado,
    // Un comercio dado de baja no entra, pague o no. Y si esta vencido, hoy
    // sigue entrando: cortarle el sistema es una decision que todavia no se tomo.
    puedeUsar: tenant.active && (AL_NO_PAGAR === 'avisar' || estado !== 'vencido'),
    productos: tenant.subscriptions.map((s) => ({
      key: s.product?.key ?? '',
      nombre: s.product?.name ?? '',
      estado: statusOf(s),
      plan: s.billingPeriod?.plan.name ?? null,
      precio: s.amount != null ? money(Number(s.amount), s.currency) : null,
      hasta: (s.agreement?.paidUntil ?? s.paidUntil)?.toISOString() ?? null,
      enPrueba: s.status === 'PRUEBA',
      tieneDebito: !!s.agreement?.mpPreapprovalId,
    })),
  };
}
