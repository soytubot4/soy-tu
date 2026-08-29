/** Cada cuánto se cobra, y cuántos meses cubre cada uno. */
export const PERIODS = [
  { key: 'MENSUAL', label: 'Mensual', months: 1 },
  { key: 'TRIMESTRAL', label: 'Trimestral', months: 3 },
  { key: 'SEMESTRAL', label: 'Semestral', months: 6 },
  { key: 'ANUAL', label: 'Anual', months: 12 },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];

export const monthsOf = (p: string) => PERIODS.find((x) => x.key === p)?.months ?? 1;

/** Precio en pesos, sin centavos: nadie cotiza un sistema en centavos. */
export const money = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

/**
 * Cuánto sale por mes. Es lo que deja comparar un trimestral con un mensual:
 * el número grande engaña y el comerciante quiere saber cuánto le pesa al mes.
 */
export const perMonth = (price: number, period: string) => price / monthsOf(period);
