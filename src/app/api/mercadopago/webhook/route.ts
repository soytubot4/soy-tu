import { NextResponse } from 'next/server';
import { processNotification } from '@/lib/subscriptions';
import { isValidSignature } from '@/lib/mp-signature';

export const dynamic = 'force-dynamic';

/**
 * Avisos de Mercado Payment.
 *
 * SIEMPRE devuelve 200, ande o falle. Si se contesta con error, Mercado Payment
 * reintenta el mismo aviso durante días y termina desactivando la notificación.
 * Lo que falla se loguea y se revisa acá, no se le devuelve a ellos.
 *
 * No se confía en el cuerpo del aviso: trae solo un id, y el detalle se va a
 * buscar a la API. Así un aviso falsificado no puede marcar a nadie como pago.
 */
export async function POST(req: Request) {
  let cuerpo: { type?: string; action?: string; data?: { id?: string } } = {};
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignorado: 'cuerpo ilegible' });
  }

  // Mercado Payment manda `type` en unos avisos y `action` ("payment.updated") en
  // otros. Se contemplan los dos.
  const tipo = cuerpo.type ?? cuerpo.action?.split('.')[0] ?? '';
  const id = cuerpo.data?.id;
  if (!tipo || !id) return NextResponse.json({ ok: true, ignorado: 'sin tipo o id' });

  // Si la firma no cierra, el aviso no es de Mercado Payment. Se descarta sin ir a
  // la API: si no, cualquiera que descubra esta URL nos hace pegar consultas.
  if (!isValidSignature(req.headers, String(id))) {
    console.warn('[mp] aviso con firma invalida, descartado');
    return NextResponse.json({ ok: true, ignorado: 'firma invalida' });
  }

  try {
    const r = await processNotification(tipo, String(id));
    if (!r.ok) console.warn('[mp] aviso no procesado:', r.motivo, cuerpo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[mp] error procesando aviso', tipo, id, (e as Error).message);
    return NextResponse.json({ ok: true, error: true });
  }
}

/** Mercado Payment pega un GET para validar la URL al configurarla. */
export function GET() {
  return NextResponse.json({ ok: true });
}
