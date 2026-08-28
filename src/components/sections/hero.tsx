/**
 * Los botones van a lo ancho y apilados en mobile: dos al lado del otro en
 * pantalla angosta entran raspando contra los bordes y el área para tocarlos con
 * el pulgar queda más chica de lo que debería.
 */
export function Hero() {
  return (
    <>
      <section
        id="top"
        className="mx-auto max-w-5xl border-b border-line px-6 py-16 text-center sm:py-24 sm:text-left"
      >
        <h1 className="max-w-[15ch] text-[clamp(2.5rem,7vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance max-sm:mx-auto max-sm:max-w-none">
          El software de tu negocio, en partes.
        </h1>
        <p className="mt-6 max-w-[56ch] text-[clamp(1.0625rem,2.2vw,1.25rem)] text-pretty text-muted max-sm:mx-auto">
          Gestión, fidelidad, turnos, bar, bots de WhatsApp y contenido con IA.
          Prendés lo que necesitás y se suman entre ellos: una sola cuenta, los
          mismos clientes, los mismos productos.
        </p>
        <div className="mt-9 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          <a
            href="#productos"
            className="rounded-lg border border-fg bg-fg px-4 py-3 text-center text-sm font-medium text-bg transition-opacity hover:opacity-85 sm:py-2"
          >
            Ver los productos
          </a>
          <a
            href="#contacto"
            className="rounded-lg border border-line-strong px-4 py-3 text-center text-sm font-medium transition-colors hover:border-fg sm:py-2"
          >
            Pedir una demo
          </a>
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
            <strong className="block text-[26px] font-semibold tracking-tight">
              {dato}
            </strong>
            <span className="text-[13px] text-muted">{texto}</span>
          </div>
        ))}
      </div>
    </>
  );
}
