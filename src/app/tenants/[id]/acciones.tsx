'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { money, PERIODS } from '@/lib/billing';

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
 * Asigna un plan y genera el link de pago.
 *
 * Cuando viene con `productKey` está cambiándole el plan a algo ya contratado, y
 * entonces el producto queda fijo: mover un comercio de soytuturno a soytubar no
 * es cambiar un plan, es contratar otra cosa.
 */
export function Acciones({
  tenantId,
  productKey,
  actual,
  catalogo,
}: {
  tenantId: string;
  subscriptionId?: string;
  productKey?: string | null;
  actual?: string | null;
  catalogo: Producto[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [periodId, setPeriodId] = useState(actual ?? '');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  // Con producto fijo se ofrecen solo sus planes; si no, todo el catálogo.
  const productos = productKey ? catalogo.filter((p) => p.key === productKey) : catalogo;
  const opciones = productos.flatMap((p) =>
    p.plans.flatMap((pl) =>
      pl.periods.map((pe) => ({
        id: pe.id,
        texto: `${productKey ? '' : `${p.name} · `}${pl.name} · ${etiqueta(pe.period)} · ${money(
          pe.price,
          pe.currency,
        )}`,
      })),
    ),
  );

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-3 text-[13px] text-muted underline hover:text-fg"
      >
        {actual ? 'Cambiar de plan' : 'Asignar plan y generar link de pago'}
      </button>
    );
  }

  if (!opciones.length) {
    return (
      <p className="mt-3 text-[13px] text-amber-500">
        No hay planes con precio cargado. Cargalos en Productos y precios.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <select
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className={`${input} min-w-64 flex-1`}
          aria-label="Plan"
        >
          <option value="">Elegí un plan…</option>
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.texto}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!periodId || cargando}
          onClick={async () => {
            setCargando(true);
            setError(null);
            setLink(null);
            try {
              const r = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, billingPeriodId: periodId }),
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
          {cargando ? 'Generando…' : 'Generar link'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className={`${input} text-muted`}>
          Cerrar
        </button>
      </div>

      {link && (
        <p className="text-[13px]">
          Link listo:{' '}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-fg"
          >
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
