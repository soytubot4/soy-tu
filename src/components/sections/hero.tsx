import { PRODUCTS } from "@/components/productos";
import { LogoBrick } from "@/components/logo";

/**
 * El hero calcado de la presentación: el ladrillo madre a la izquierda, el
 * lema a la derecha y las pills de los productos abajo (cada una con su color
 * del espectro, linkeando a su sitio).
 *
 * Los botones van a lo ancho y apilados en mobile: dos al lado del otro en
 * pantalla angosta entran raspando contra los bordes y el área para tocarlos
 * con el pulgar queda más chica de lo que debería.
 */
export function Hero() {
  return (
    <>
      <section
        id="top"
        className="mx-auto max-w-5xl border-b border-line px-6 py-16 sm:py-24"
      >
        <div className="flex flex-col items-center gap-10 text-center sm:flex-row sm:items-center sm:gap-14 sm:text-left">
          <div className="w-60 shrink-0 sm:w-80">
            <LogoBrick className="w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[clamp(2.25rem,5.5vw,3.5rem)] leading-[1.06] font-bold tracking-[-0.02em] text-balance">
              El software de tu negocio,{" "}
              <em className="text-primary-tx" style={{ textShadow: "0 0 28px rgb(31 91 255 / 0.4)" }}>
                en partes.
              </em>
            </h1>
            <p className="mt-5 max-w-[56ch] text-[clamp(1rem,2vw,1.125rem)] text-pretty text-muted max-sm:mx-auto">
              Prendés lo que necesitás y se suman entre ellos: una sola cuenta,
              los mismos clientes, los mismos productos.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-2.5 sm:justify-start">
              {PRODUCTS.map((p) => (
                <a
                  key={p.slug}
                  href={p.sitio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pill transition-shadow hover:shadow-[0_0_14px_var(--glow)]"
                  style={{ borderColor: p.color, "--glow": `${p.color}73` } as React.CSSProperties}
                >
                  SOY TU <span style={{ color: p.colorTx }}>{p.marca}</span>
                </a>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
              <a href="#productos" className="btn btn-primary max-sm:h-12">
                Ver los productos
              </a>
              <a href="#contacto" className="btn btn-secondary max-sm:h-12">
                Pedir una demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl grid-cols-2 border-b border-line md:grid-cols-4">
        {[
          ["6", "productos que se combinan"],
          ["1", "cuenta para todos"],
          ["0", "datos duplicados"],
          ["AFIP", "facturación electrónica"],
        ].map(([dato, texto], i) => (
          <div
            key={texto}
            className={`border-line px-6 py-8 text-center sm:text-left ${
              i % 2 === 0 ? "border-r" : ""
            } ${i < 2 ? "border-b md:border-b-0" : ""} md:border-r md:last:border-r-0 ${
              i === 1 ? "md:border-r" : ""
            }`}
          >
            <strong className="block text-[26px] font-bold tracking-tight text-primary-tx">
              {dato}
            </strong>
            <span className="text-[13px] text-muted-2">{texto}</span>
          </div>
        ))}
      </div>
    </>
  );
}
