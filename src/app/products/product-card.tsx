'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CURRENCIES, PERIODS } from '@/lib/billing';

type Period = { id: string; period: string; label: string; precio: string; porMes: string };
type Plan = { id: string; name: string; features: string[]; active: boolean; periods: Period[] };
export type Product = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  active: boolean;
  plans: Plan[];
};

const input =
  'rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-fg';
const btn = 'rounded-lg border border-fg bg-fg px-3 py-2 text-sm font-medium text-bg disabled:opacity-40';
const btnGhost = 'rounded-lg border border-line px-3 py-2 text-sm';

async function post(url: string, body: unknown, method = 'POST') {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error ?? 'No se pudo guardar');
  return j;
}

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [nuevoPlan, setNuevoPlan] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function correr(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className={`rounded-xl border border-line p-6 ${product.active ? '' : 'opacity-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{product.name}</h2>
          <p className="text-[13px] text-muted">
            {product.key}
            {!product.active && ' · desactivado'}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            correr(() =>
              post('/api/billing/products', { id: product.id, active: !product.active }, 'PATCH'),
            )
          }
          className="text-[13px] text-muted underline hover:text-fg"
        >
          {product.active ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {product.plans.map((plan) => (
          <PlanBlock key={plan.id} plan={plan} onRun={correr} />
        ))}
        {!product.plans.length && (
          <p className="text-[13px] text-muted">Sin planes. Agregá uno para poder ponerle precio.</p>
        )}
      </div>

      <div className="mt-5 flex gap-2 border-t border-line pt-4">
        <input
          value={nuevoPlan}
          onChange={(e) => setNuevoPlan(e.target.value)}
          placeholder="Nombre del plan (Básico, Full…)"
          className={`${input} flex-1`}
        />
        <button
          type="button"
          disabled={!nuevoPlan.trim()}
          onClick={() =>
            correr(async () => {
              await post('/api/billing/plans', { productId: product.id, name: nuevoPlan });
              setNuevoPlan('');
            })
          }
          className={btn}
        >
          Agregar plan
        </button>
      </div>

      {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}
    </section>
  );
}

function PlanBlock({
  plan,
  onRun,
}: {
  plan: Plan;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [periodo, setPeriodo] = useState<string>('MENSUAL');
  const [precio, setPrecio] = useState('');
  // Arranca en USD porque es como se cotiza; el cobro se convierte a pesos al
  // oficial del dia, asi el precio no se atrasa solo.
  const [moneda, setMoneda] = useState<string>('USD');

  const faltantes = PERIODS.filter((p) => !plan.periods.some((x) => x.period === p.key));

  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{plan.name}</p>
        <button
          type="button"
          onClick={() => onRun(() => post('/api/billing/plans', { id: plan.id }, 'DELETE'))}
          className="text-[13px] text-muted underline hover:text-red-500"
        >
          Borrar
        </button>
      </div>

      {!!plan.features.length && (
        <p className="mt-1 text-[13px] text-muted">{plan.features.join(' · ')}</p>
      )}

      {!!plan.periods.length && (
        <ul className="mt-3 space-y-1.5">
          {plan.periods.map((pe) => (
            <li key={pe.id} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-muted">{pe.label}</span>
              <span className="font-medium tabular-nums">{pe.precio}</span>
              {/* Lo que deja comparar frecuencias: el número grande engaña. */}
              {pe.period !== 'MENSUAL' && (
                <span className="text-[13px] text-muted">({pe.porMes} por mes)</span>
              )}
              <button
                type="button"
                onClick={() => onRun(() => post('/api/billing/periods', { id: pe.id }, 'DELETE'))}
                className="ml-auto text-[13px] text-muted underline hover:text-red-500"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {!!faltantes.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={`${input} w-36`}
          >
            {faltantes.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className={`${input} w-24`}
            aria-label="Moneda"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            inputMode="decimal"
            placeholder="Precio"
            className={`${input} w-28`}
          />
          <button
            type="button"
            disabled={!precio}
            onClick={() =>
              onRun(async () => {
                await post('/api/billing/periods', {
                  planId: plan.id,
                  period: periodo,
                  price: Number(precio),
                  currency: moneda,
                });
                setPrecio('');
              })
            }
            className={btn}
          >
            Poner precio
          </button>
        </div>
      )}
    </div>
  );
}

export function NewProduct() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className={btnGhost}>
        Nuevo producto
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line p-5">
      <p className="mb-3 text-sm font-medium">Nuevo producto</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (Bar)"
          className={`${input} flex-1`}
        />
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="clave (soytubar)"
          className={`${input} w-44`}
        />
      </div>
      <p className="mt-2 text-[13px] text-muted">
        La clave tiene que ser igual a la que usa el comercio en sus productos prendidos:
        soytuadmin, soytubar, soytucanje, soytuturno, soytucine.
      </p>
      {error && <p className="mt-2 text-[13px] text-red-500">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!key.trim() || !name.trim()}
          onClick={async () => {
            setError(null);
            try {
              await post('/api/billing/products', { key, name });
              setAbierto(false);
              setKey('');
              setName('');
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
          className={btn}
        >
          Crear
        </button>
        <button type="button" onClick={() => setAbierto(false)} className={btnGhost}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
