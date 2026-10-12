import { LogoTorre } from "@/components/logo";

const PASOS = [
  {
    n: "01",
    titulo: "Empezás por uno",
    texto:
      "El que más te aprieta hoy. No hay que migrar todo el negocio de golpe ni contratar lo que no vas a usar.",
  },
  {
    n: "02",
    titulo: "Sumás el que sigue",
    texto:
      "Se prende y ya tiene tus clientes y tus productos adentro. No hay importación ni carga de nuevo.",
  },
  {
    n: "03",
    titulo: "Trabajan juntos",
    texto:
      "La venta del bar suma puntos de fidelidad. El turno de la cancha se cobra en la barra. El bot reserva en la agenda.",
  },
];

/** Lo que no se ve y es lo que más vende: comparten la misma base. */
export function ComoFunciona() {
  return (
    <section id="como" className="mx-auto max-w-5xl border-b border-line px-6 py-20 sm:py-26">
      <p className="mb-3 text-xs tracking-[0.1em] text-muted-2 uppercase max-sm:text-center">
        Cómo funciona
      </p>
      <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em] text-balance max-sm:text-center">
        Se suman entre ellos, no se pisan
      </h2>
      <p className="mt-4 max-w-[60ch] text-pretty text-muted max-sm:mx-auto max-sm:text-center">
        Son productos separados, pero comparten la misma base. Un cliente se carga
        una vez y lo ven todos. Un producto se carga una vez y se vende en el
        mostrador, en el bar y en la tienda online.
      </p>

      <div className="mt-14 flex flex-col items-center gap-10 md:flex-row md:items-stretch md:gap-12">
        {/* La torre: los productos apilados, que es literalmente la idea. */}
        <LogoTorre className="w-36 shrink-0 self-center md:w-44" />
        <div className="grid flex-1 content-center overflow-hidden rounded-xl border border-line self-stretch">
          {PASOS.map((p, i) => (
            <div
              key={p.n}
              className={`px-7 py-8 text-center sm:text-left ${
                i < PASOS.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <p className="text-[13px] font-semibold tabular-nums text-primary-tx">{p.n}</p>
              <h3 className="mt-2.5 text-[17px] font-semibold tracking-[-0.02em]">{p.titulo}</h3>
              <p className="mt-2 text-sm text-pretty text-muted">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
