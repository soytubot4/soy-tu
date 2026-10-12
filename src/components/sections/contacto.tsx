import { EMAIL, WHATSAPP } from "@/components/productos";

export function Contacto() {
  return (
    <section
      id="contacto"
      className="mx-auto max-w-5xl border-b border-line px-6 py-20 text-center sm:py-24"
    >
      <h2 className="mx-auto max-w-[18ch] text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em] text-balance">
        Contanos qué necesitás
      </h2>
      <p className="mx-auto mt-4 max-w-[60ch] text-pretty text-muted">
        Te mostramos cómo quedaría con tus productos y tus clientes, sin compromiso.
      </p>
      <div className="mt-9 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary max-sm:h-12 max-sm:w-full max-sm:max-w-sm"
        >
          Escribinos por WhatsApp
        </a>
        <a href={`mailto:${EMAIL}`} className="btn btn-secondary max-sm:h-12 max-sm:w-full max-sm:max-w-sm">
          {EMAIL}
        </a>
      </div>
    </section>
  );
}
