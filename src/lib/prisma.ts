import { PrismaClient } from '../../node_modules/.prisma/soytu';

/**
 * Cliente contra la base COMPARTIDA de los cinco productos.
 *
 * Este panel solo LEE: crear o modificar comercios sigue siendo trabajo de cada
 * producto, que es el que sabe qué más hay que dejar armado (depósitos, listas de
 * precios, dominios). Desde acá se mira el conjunto.
 *
 * El singleton evita que el hot reload abra una conexión nueva en cada cambio
 * hasta agotar el pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
