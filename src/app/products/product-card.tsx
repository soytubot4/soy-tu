'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CURRENCIES, PERIODS } from '@/lib/billing';

type Period = {
  id: string;
  period: string;
  label: string;
  price: number;
  currency: string;
  precio: string;
  porMes: string;
};
type Plan = {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  active: boolean;
  periods: Period[];
};
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
const link = 'text-[13px] text-muted underline hover:text-fg';

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

/** Las features se editan una por línea: escribirlas separadas por coma rompe
 *  la primera vez que alguien pone "Hasta 5 profesionales, sin límite de turnos". */
const aLineas = (fs: string[]) => fs.join('\n');
const aFeatures = (t: string) =>
  t.split('\n').map((f) => f.trim()).filter(Boolean);

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [nuevoPlan, setNuevoPlan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(product.name);
  const [desc, setDesc] = useState(product.description ?? '');

  async function correr(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // El cambiado se compara contra lo que vino del server: sin esto el botón de
  // guardar queda habilitado siempre y no se sabe si quedó algo sin guardar.
  const cambiado = nombre !== product.name || desc !== (product.description ?? '');

  return (
    <section className={`rounded-xl border border-line p-6 ${product.active ? '' : 'opacity-50'}`}>
      {editando ? (
        <div className="space-y-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del producto"
            className={`${input} w-full font-medium`}
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            className={`${input} w-full`}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!cambiado || !nombre.trim()}
              onClick={() =>
                correr(async () => {
                  await post(
                    '/api/billing/products',
                    { id: product.id, name: nombre, description: desc },
                    'PATCH',
                  );
                  setEditando(false);
                })
              }
              className={btn}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setNombre(product.name);
                setDesc(product.description ?? '');
                setEditando(false);
              }}
              className={btnGhost}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{product.name}</h2>
            <p className="text-[13px] text-muted">
              {product.key}
              {product.description && ` · ${product.description}`}
              {!product.active && ' · desactivado'}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button type="button" onClick={() => setEditando(true)} className={link}>
              Editar
            </button>
            <button
              type="button"
              onClick={() =>
                correr(() =>
                  post(
                    '/api/billing/products',
                    { id: product.id, active: !product.active },
                    'PATCH',
                  ),
                )
              }
              className={link}
            >
              {product.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      )}

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
  // oficial del día, así el precio no se atrasa solo.
  const [moneda, setMoneda] = useState<string>('USD');
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(plan.name);
  const [desc, setDesc] = useState(plan.description ?? '');
  const [features, setFeatures] = useState(aLineas(plan.features));

  const faltantes = PERIODS.filter((p) => !plan.periods.some((x) => x.period === p.key));
  const cambiado =
    nombre !== plan.name ||
    desc !== (plan.description ?? '') ||
    features !== aLineas(plan.features);

  return (
    <div className={`rounded-lg border border-line bg-card p-4 ${plan.active ? '' : 'opacity-50'}`}>
      {editando ? (
        <div className="space-y-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del plan"
            className={`${input} w-full font-medium`}
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Para quién es (Barbería, consultorio…)"
            className={`${input} w-full`}
          />
          <textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            rows={5}
            placeholder="Qué incluye, uno por línea"
            className={`${input} w-full resize-y`}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!cambiado || !nombre.trim()}
              onClick={() =>
                onRun(async () => {
                  await post(
                    '/api/billing/plans',
                    {
                      id: plan.id,
                      name: nombre,
                      description: desc,
                      features: aFeatures(features),
                    },
                    'PATCH',
                  );
                  setEditando(false);
                })
              }
              className={btn}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setNombre(plan.name);
                setDesc(plan.description ?? '');
                setFeatures(aLineas(plan.features));
                setEditando(false);
              }}
              className={btnGhost}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {plan.name}
                {!plan.active && <span className="text-muted"> · desactivado</span>}
              </p>
              {plan.description && <p className="text-[13px] text-muted">{plan.description}</p>}
            </div>
            <div className="flex shrink-0 gap-3">
              <button type="button" onClick={() => setEditando(true)} className={link}>
                Editar
              </button>
              <button
                type="button"
                onClick={() =>
                  onRun(() =>
                    post('/api/billing/plans', { id: plan.id, active: !plan.active }, 'PATCH'),
                  )
                }
                className={link}
              >
                {plan.active ? 'Desactivar' : 'Activar'}
              </button>
              <button
                type="button"
                onClick={() => onRun(() => post('/api/billing/plans', { id: plan.id }, 'DELETE'))}
                className="text-[13px] text-muted underline hover:text-red-500"
              >
                Borrar
              </button>
            </div>
          </div>

          {!!plan.features.length && (
            <p className="mt-1 text-[13px] text-muted">{plan.features.join(' · ')}</p>
          )}
        </>
      )}

      {!!plan.periods.length && (
        <ul className="mt-3 space-y-1.5">
          {plan.periods.map((pe) => (
            <PeriodRow key={pe.id} planId={plan.id} period={pe} onRun={onRun} />
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

/**
 * Un renglón de precio. Se edita en el lugar: cambiar el precio de un plan es lo
 * que más se va a hacer acá, y mandarlo a otra pantalla para tocar un número
 * sería el camino largo para la tarea más frecuente.
 */
function PeriodRow({
  planId,
  period,
  onRun,
}: {
  planId: string;
  period: Period;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [precio, setPrecio] = useState(String(period.price));
  const [moneda, setMoneda] = useState(period.currency);

  const cambiado = Number(precio) !== period.price || moneda !== period.currency;

  function guardar() {
    if (!precio || Number.isNaN(Number(precio))) return;
    onRun(async () => {
      // Es el mismo upsert del alta: mismo plan + misma frecuencia corrige el
      // precio en vez de duplicar el renglón.
      await post('/api/billing/periods', {
        planId,
        period: period.period,
        price: Number(precio),
        currency: moneda,
      });
      setEditando(false);
    });
  }

  if (editando) {
    return (
      <li className="flex flex-wrap items-center gap-2 text-sm">
        <span className="w-24 shrink-0 text-muted">{period.label}</span>
        <select
          value={moneda}
          onChange={(e) => setMoneda(e.target.value)}
          className={`${input} w-24 py-1`}
          aria-label={`Moneda ${period.label}`}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardar();
            if (e.key === 'Escape') {
              setPrecio(String(period.price));
              setMoneda(period.currency);
              setEditando(false);
            }
          }}
          inputMode="decimal"
          autoFocus
          className={`${input} w-28 py-1 tabular-nums`}
          aria-label={`Precio ${period.label}`}
        />
        <button type="button" disabled={!cambiado} onClick={guardar} className={`${btn} py-1`}>
          Guardar
        </button>
        <button
          type="button"
          onClick={() => {
            setPrecio(String(period.price));
            setMoneda(period.currency);
            setEditando(false);
          }}
          className={`${btnGhost} py-1`}
        >
          Cancelar
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-24 text-muted">{period.label}</span>
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="font-medium tabular-nums underline decoration-transparent underline-offset-4 hover:decoration-inherit"
        title="Cambiar el precio"
      >
        {period.precio}
      </button>
      {/* Lo que deja comparar frecuencias: el número grande engaña. */}
      {period.period !== 'MENSUAL' && (
        <span className="text-[13px] text-muted">({period.porMes} por mes)</span>
      )}
      <button
        type="button"
        onClick={() => onRun(() => post('/api/billing/periods', { id: period.id }, 'DELETE'))}
        className="ml-auto text-[13px] text-muted underline hover:text-red-500"
      >
        Quitar
      </button>
    </li>
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
        Agregar producto
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line p-5">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (Turnos, Bar…)"
          className={`${input} flex-1`}
        />
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Clave (soytuturno)"
          className={`${input} w-48`}
        />
        <button
          type="button"
          disabled={!name.trim() || !key.trim()}
          onClick={async () => {
            setError(null);
            try {
              await post('/api/billing/products', { key, name });
              setKey('');
              setName('');
              setAbierto(false);
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
      <p className="mt-2 text-[13px] text-muted">
        La clave tiene que ser la misma que usa el comercio en sus productos activos.
      </p>
      {error && <p className="mt-2 text-[13px] text-red-500">{error}</p>}
    </div>
  );
}
