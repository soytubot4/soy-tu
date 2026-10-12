'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCTS } from '@/lib/products';

export type TenantRow = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  enabledProducts: string[];
  ownerEmail: string | null;
  email: string | null;
};

/**
 * Una fila editable.
 *
 * Se edita en la misma tabla y no en una pantalla aparte: lo que se cambia acá
 * es una cosa por vez —prender un producto, dar de baja— y mandar al superadmin
 * a otra pantalla para tocar un switch es más viaje que trabajo.
 */
export function EditableRow({ t, children }: { t: TenantRow; children: React.ReactNode }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(t.name);
  const [productos, setProductos] = useState<string[]>(t.enabledProducts);
  const [activo, setActivo] = useState(t.active);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sucio =
    nombre !== t.name ||
    activo !== t.active ||
    productos.slice().sort().join() !== t.enabledProducts.slice().sort().join();

  async function guardar() {
    setGuardando(true);
    setError(null);
    const r = await fetch(`/api/tenants/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nombre, active: activo, enabledProducts: productos }),
    });
    const j = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) return setError(j?.error ?? 'No se pudo guardar');
    setAbierto(false);
    router.refresh();
  }

  return (
    <>
      <tr className={`border-b border-line ${t.active ? '' : 'opacity-45'}`}>
        {children}
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="text-[13px] text-muted underline transition-colors hover:text-fg"
          >
            {abierto ? 'Cerrar' : 'Editar'}
          </button>
        </td>
      </tr>

      {abierto && (
        <tr className="border-b border-line bg-card">
          <td colSpan={6} className="px-4 py-5">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] text-muted">Nombre</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="max-w-sm rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-primary-tx"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] text-muted">Productos</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCTS.map((p) => {
                    const puesto = productos.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() =>
                          setProductos((ps) =>
                            puesto ? ps.filter((x) => x !== p.key) : [...ps, p.key],
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-[13px] ${
                          puesto ? 'border-primary text-primary-tx' : 'border-line text-muted'
                        }`}
                      >
                        {p.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                Comercio activo
              </label>

              {error && <p className="text-[13px] text-red-500">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={guardar}
                  disabled={!sucio || guardando}
                  className="btn btn-primary"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
                {sucio && (
                  <button
                    type="button"
                    onClick={() => {
                      setNombre(t.name);
                      setProductos(t.enabledProducts);
                      setActivo(t.active);
                      setError(null);
                    }}
                    className="rounded-lg border border-line px-4 py-2 text-sm"
                  >
                    Revertir
                  </button>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
