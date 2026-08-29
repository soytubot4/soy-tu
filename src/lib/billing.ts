/** Cada cuánto se cobra, y cuántos meses cubre cada uno. */
export const PERIODS = [
  { key: 'MENSUAL', label: 'Mensual', months: 1 },
  { key: 'TRIMESTRAL', label: 'Trimestral', months: 3 },
  { key: 'SEMESTRAL', label: 'Semestral', months: 6 },
  { key: 'ANUAL', label: 'Anual', months: 12 },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];

export const monthsOf = (p: string) => PERIODS.find((x) => x.key === p)?.months ?? 1;

export const CURRENCIES = ['ARS', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/**
 * Precio sin centavos: nadie cotiza un sistema en centavos.
 *
 * Se muestra la moneda siempre, incluso en pesos: con planes en ARS y en USD
 * conviviendo, un "$20" sin aclarar es la diferencia entre veinte pesos y veinte
 * dólares.
 */
export const money = (n: number, currency = 'ARS') =>
  `${currency === 'USD' ? 'USD ' : '$'}${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

/**
 * Cuánto sale por mes. Es lo que deja comparar un trimestral con un mensual:
 * el número grande engaña y el comerciante quiere saber cuánto le pesa al mes.
 */
export const perMonth = (price: number, period: string) => price / monthsOf(period);

/**
 * El precio se define en USD pero se COBRA en pesos, al oficial del día.
 *
 * Por eso la conversión pasa recién al generar el cobro y no al guardar el
 * precio: si se guardara convertido, el número quedaría clavado al dólar del día
 * que se cargó y en tres meses estarías cobrando de menos sin darte cuenta.
 *
 * La cotización se busca al momento de crear la suscripción y se guarda junto al
 * pago, así después se puede explicar por qué a un comercio le salió distinto
 * que a otro el mismo plan.
 */
export async function officialRate(): Promise<number> {
  const res = await fetch('https://dolarapi.com/v1/dolares/oficial', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo traer la cotización del dólar');
  const d = (await res.json()) as { venta?: number };
  if (!d.venta) throw new Error('La cotización vino vacía');
  return d.venta;
}

/** Cuánto se cobra en pesos, redondeado: Mercado Pago no cobra centavos. */
export const toPesos = (price: number, currency: string, rate: number) =>
  currency === 'USD' ? Math.round(price * rate) : price;
