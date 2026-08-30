import { prisma } from './prisma';
import { activateSubscription } from './mercadopago';
import { log } from './subscriptions';

/**
 * Arranca el cobro de los que se les terminó la prueba y ya dejaron la tarjeta.
 *
 * Cuando el comerciante carga la tarjeta se crea el preapproval en `pending`:
 * autorizado a debitar, pero sin debitar nada. Es a propósito — se le prometió
 * que no se le cobra durante el mes de prueba. Alguien tiene que ponerlo en
 * marcha el día 30, y esto es ese alguien.
 *
 * Se dispara al consultar el estado en vez de con un cron: la consulta la hace
 * cada producto cuando el comerciante abre su panel, así que en la práctica pasa
 * el mismo día. Un cron sería más prolijo, pero suma una pieza de infraestructura
 * para algo que ya tiene quién lo despierte.
 *
 * Nunca puede voltear la consulta: si Mercado Pago no responde, el panel tiene
 * que mostrar el estado igual. Se reintenta a la próxima.
 */
export async function activarVencidos(tenantId: string): Promise<void> {
  const acuerdos = await prisma.billingAgreement.findMany({
    where: {
      tenantId,
      status: 'pending',
      mpPreapprovalId: { not: null },
      // Solo los que ya cumplieron: activar antes sería cobrarle de más.
      subscriptions: { some: { status: 'PRUEBA', paidUntil: { lt: new Date() } } },
    },
    select: { id: true, mpPreapprovalId: true },
  });

  for (const a of acuerdos) {
    try {
      const pre = await activateSubscription(a.mpPreapprovalId!);

      // El estado se toma de lo que contestó Mercado Pago, no del que pedimos:
      // puede rechazarlo (tarjeta vencida, sin fondos) y ahí no está autorizado.
      await prisma.$transaction([
        prisma.billingAgreement.update({
          where: { id: a.id },
          data: { status: pre.status, lastEvent: pre as object, lastEventAt: new Date() },
        }),
        prisma.subscription.updateMany({
          where: { agreementId: a.id },
          data: { status: pre.status },
        }),
      ]);

      await log({
        tenantId,
        agreementId: a.id,
        kind: pre.status === 'authorized' ? 'creada' : 'pago-rechazado',
        description:
          pre.status === 'authorized'
            ? 'Terminó la prueba y arrancó el débito automático'
            : `Terminó la prueba pero Mercado Pago dejó el débito en "${pre.status}"`,
        data: { preapprovalId: a.mpPreapprovalId },
      });
    } catch (e) {
      // Se reintenta la próxima vez que alguien consulte. No se corta el resto
      // ni se rompe la consulta del panel.
      console.error(`[activar] ${a.mpPreapprovalId}: ${(e as Error).message}`);
    }
  }
}
