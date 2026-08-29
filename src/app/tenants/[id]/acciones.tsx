'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { money, monthsOf, PERIODS } from '@/lib/billing';

type Periodo = { id: string; period: string; price: number; currency: string };
type Producto = {
  id: string;
  key: string;
  name: string;
  plans: { id: string; name: string; periods: Periodo[] }[];
};

const input =
  'rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-fg';
const btn = 'rounded-lg border border-fg bg-fg px-3 py-2 text-sm font-medium text-bg disabled:opacity-40';
const etiqueta = (p: string) => PERIODS.find((x) => x.key === p)?.label ?? p;

/**
 * Arma el cobro de un comercio: qué productos, con qué plan, en un solo débito.
 *
 * Un producto por renglón y todos juntos en un botón, en vez de contratarlos de
 * a uno: el comercio que suma soytucanje a lo que ya tiene no quiere un segundo
 * débito, quiere que le suba el que ya paga.
 */
export function Contratar({
  tenantId,
  catalogo,
  actuales,
}: {
  tenantId: string;
  catalogo: Producto[];
  /** Lo que ya tiene, por clave de producto, para dejarlo preseleccionado. */
  actuales: Record<string, string>;
}) {
  const router = useRouter();
  const [elegidos, setElegidos] = useState<Record<string, string>>(actuales);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const ids = Object.values(elegidos).filter(Boolean);

  // Todo lo elegido se ve resumido antes de generar el link: es plata, y el
  // total no puede aparecer recién en el resumen de la tarjeta.
  const seleccion = catalogo.flatMap((p) => {
    const id = elegidos[p.key];
    if (!id) return [];
    for (const pl of p.plans) {
      const pe = pl.periods.find((x) => x.id === id);
      if (pe) return [{ producto: p.name, plan: pl.name, ...pe }];
    }
    return [];
  });

  const frecuencias = [...new Set(seleccion.map((s) => monthsOf(s.period)))];
  const mezclado = frecuencias.length > 1;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {catalogo.map((p) => {
          const opciones = p.plans.flatMap((pl) =>
            pl.periods.map((pe) => ({
              id: pe.id,
              texto: `${pl.name} · ${etiqueta(pe.period)} · ${money(pe.price, pe.currency)}`,
            })),
          );
          return (
            <label key={p.key} className="flex flex-wrap items-center gap-2">
              <span className="w-32 shrink-0 text-sm">{p.name}</span>
              <select
                value={elegidos[p.key] ?? ''}
                onChange={(e) =>
                  setElegidos((v) => ({ ...v, [p.key]: e.target.value }))
                }
                className={`${input} min-w-64 flex-1`}
              >
                <option value="">No lo contrata</option>
                {opciones.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.texto}
                  </option>
                ))}
              </select>
              {!opciones.length && (
                <span className="text-[13px] text-amber-500">sin precios cargados</span>
              )}
            </label>
          );
        })}
      </div>

      {!!seleccion.length && (
        <div className="rounded-lg border border-line bg-card p-4 text-sm">
          <ul className="space-y-1">
            {seleccion.map((s) => (
              <li key={s.id} className="flex justify-between gap-4">
                <span className="text-muted">
                  {s.producto} · {s.plan} · {etiqueta(s.period)}
                </span>
                <span className="tabular-nums">{money(s.price, s.currency)}</span>
              </li>
            ))}
          </ul>
          {mezclado ? (
            <p className="mt-3 border-t border-line pt-3 text-[13px] text-amber-500">
              Elegiste frecuencias distintas. Un débito tiene una sola: poné todos en la misma, o
              cobralos por separado.
            </p>
          ) : (
            <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">
              Un solo débito cada {frecuencias[0] === 1 ? 'mes' : `${frecuencias[0]} meses`}.
              {seleccion.some((s) => s.currency === 'USD') &&
                ' Lo cotizado en dólares se pasa a pesos al oficial del día del cobro.'}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ids.length || mezclado || cargando}
          onClick={async () => {
            setCargando(true);
            setError(null);
            setLink(null);
            try {
              const r = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, billingPeriodIds: ids }),
              });
              const j = await r.json();
              if (!r.ok) throw new Error(j?.error ?? 'No se pudo generar el link');
              setLink(j.link ?? null);
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setCargando(false);
            }
          }}
          className={btn}
        >
          {cargando ? 'Generando…' : 'Generar link de pago'}
        </button>
      </div>

      {link && (
        <p className="text-[13px]">
          Link listo:{' '}
          <a href={link} target="_blank" rel="noopener noreferrer" className="underline">
            {link}
          </a>
          <span className="block text-muted">Pasáselo al comerciante para que lo pague.</span>
        </p>
      )}
      {error && <p className="text-[13px] text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Una nota a mano en el historial.
 *
 * Lo que pasa por fuera del sistema —un acuerdo por teléfono, un mes bonificado,
 * una transferencia— es justo lo que después nadie recuerda. Si no se puede
 * anotar acá, se anota en un cuaderno y se pierde.
 */
export function Nota({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-[13px] text-muted underline hover:text-fg"
      >
        Anotar algo
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Pagó por transferencia, se le bonificó el mes…"
        className={`${input} w-72`}
        autoFocus
      />
      <button
        type="button"
        disabled={!texto.trim() || guardando}
        onClick={async () => {
          setGuardando(true);
          setError(null);
          try {
            const r = await fetch('/api/subscriptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId, description: texto }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error ?? 'No se pudo guardar');
            setTexto('');
            setAbierto(false);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setGuardando(false);
          }
        }}
        className={btn}
      >
        Guardar
      </button>
      <button type="button" onClick={() => setAbierto(false)} className={`${input} text-muted`}>
        Cancelar
      </button>
      {error && <p className="w-full text-[13px] text-red-500">{error}</p>}
    </div>
  );
}
