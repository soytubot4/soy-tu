import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifica que el aviso lo mandó Mercado Pago y no cualquiera que descubrió la
 * URL del webhook.
 *
 * Mercado Pago firma con la clave secreta que se genera en el panel. El manifest
 * que se firma es `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` — el orden y
 * los puntos y coma importan, cualquier diferencia da otra firma.
 *
 * Si no hay clave configurada devuelve `true`: sin ella no se puede verificar
 * nada, y bloquear todos los avisos por una variable que falta sería peor —
 * dejaría de registrarse cada cobro sin que nadie se entere. El webhook igual no
 * confía en el cuerpo: va a buscar el detalle a la API.
 */
export function firmaValida(headers: Headers, dataId: string): boolean {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return true;

  const firma = headers.get('x-signature');
  const requestId = headers.get('x-request-id');
  if (!firma) return false;

  // x-signature viene como "ts=1700000000,v1=abc123..."
  const partes = Object.fromEntries(
    firma.split(',').map((p) => p.split('=').map((x) => x.trim()) as [string, string]),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId ?? ''};ts:${ts};`;
  const esperado = createHmac('sha256', secreto).update(manifest).digest('hex');

  // Comparación de tiempo constante: comparar con === filtra información sobre
  // la firma correcta a partir de cuánto tarda en fallar.
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
