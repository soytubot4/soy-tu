import { PRODUCTS } from "@/components/productos";
import { LogoProducto } from "@/components/logo";

/**
 * Las tarjetas son links: cada producto tiene su propio sitio y ahí están los
 * precios. soytu explica y deriva, no vende.
 *
 * Cada producto se identifica con SU color del espectro (guía de marca): la
 * pill arriba, el glow del borde en hover y el dominio al pie. El resto de la
 * tarjeta queda en la paleta madre para que el color señale y no grite.
 *
 * Las listas de features NO se centran en mobile aunque el resto sí: una lista
 * centrada no se puede barrer con la vista, el ojo pierde dónde arranca cada
 * renglón.
 */
export function ProductosGrid() {
  return (
    <section id="productos" className="mx-auto max-w-5xl border-b border-line px-6 py-20 sm:py-26">
      <p className="mb-3 text-xs tracking-[0.1em] text-muted-2 uppercase max-sm:text-center">
        Productos
      </p>
      <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em] text-balance max-sm:text-center">
        Cada negocio usa los que necesita
      </h2>
      <p className="mt-4 max-w-[60ch] text-pretty text-muted max-sm:mx-auto max-sm:text-center">
        No es un sistema gigante con módulos apagados. Es un producto por trabajo,
        pensado para quien lo va a usar: el que atiende, el que gestiona y el que
        vende. Tocá cualquiera para ver los detalles y los precios en su sitio.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p) => (
          <a
            key={p.slug}
            href={p.sitio}
            target="_blank"
            rel="noopener noreferrer"
            style={{ "--pc": p.color, "--glow": `${p.color}2E` } as React.CSSProperties}
            className="group flex flex-col rounded-xl border border-line bg-card p-7 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-(--pc) hover:shadow-[0_0_24px_var(--glow)]"
          >
            <LogoProducto producto={p.marca.toLowerCase()} className="mb-4 h-24 self-start" />
            <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{p.nombre}</h3>
            <p className="mt-1 text-[13px] text-muted-2">{p.rubro}</p>
            <p className="mt-4 text-[15px] text-pretty text-muted">{p.descripcion}</p>

            <ul className="mt-5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="border-t border-line py-[7px] text-muted">
                  <span className="mr-2.5" style={{ color: p.color }}>
                    —
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <p className="mt-auto pt-[22px] text-[13px] text-muted-2">{p.paraQuien}</p>
            <p
              className="mt-3.5 border-t border-line pt-3.5 text-[13px] font-medium"
              style={{ color: p.colorTx }}
            >
              {p.sitio.replace("https://", "")}{" "}
              <span className="inline-block transition-transform group-hover:translate-x-[3px]">
                &rarr;
              </span>
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
