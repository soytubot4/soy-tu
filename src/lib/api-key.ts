import { timingSafeEqual } from 'node:crypto';

/**
 * Autenticación de los otros productos contra la API de facturación.
 *
 * Mismo criterio que los bots de n8n en el resto del sistema: header `x-api-key`
 * contra una env, y el comercio sale del slug de la URL y no de un header. Así
 * un producto no puede pedir por otro comercio equivocándose de header.
 *
 * Es una key de servidor a servidor: NUNCA puede terminar en el navegador. Lo
 * que la usa es la API de soytucanje/soytuadmin, no su front.
 */
export function validApiKey(req: Request): boolean {
  const esperada = process.env.SOYTU_BILLING_KEY;
  // Sin key configurada no se abre la puerta: dejar pasar todo cuando falta la
  // env es cómodo en desarrollo y un agujero en producción.
  if (!esperada) return false;

  const recibida = req.headers.get('x-api-key');
  if (!recibida) return false;

  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  // Comparar largos primero porque timingSafeEqual explota si difieren.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
