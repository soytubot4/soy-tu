/* eslint-disable @next/next/no-img-element */
/**
 * Los logos oficiales de la marca (los SVG exportados de la presentación,
 * en /public/marca): el ladrillo madre, el de cada producto y la torre.
 * Vienen con el glow adentro y fondo transparente: van directo con <img>.
 */
export function LogoBrick({ className = "" }: { className?: string }) {
  return <img src="/marca/soy-tu.svg" alt="" aria-hidden="true" className={className} />;
}

/** El ladrillo de un producto (admin, bar, bot, canje, cine, turno). */
export function LogoProducto({ producto, className = "" }: { producto: string; className?: string }) {
  return <img src={`/marca/${producto}.svg`} alt="" aria-hidden="true" className={className} />;
}

/** La torre: todos los productos apilados. "Se suman entre ellos". */
export function LogoTorre({ className = "" }: { className?: string }) {
  return <img src="/marca/torre.svg" alt="" aria-hidden="true" className={className} />;
}

/** El wordmark: SOY en Luz y TU en azul eléctrico con su brillo. */
export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      SOY{" "}
      <span className="text-primary-tx" style={{ textShadow: "0 0 28px rgb(31 91 255 / 0.53)" }}>
        TU
      </span>
    </span>
  );
}
