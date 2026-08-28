import { WHATSAPP } from "@/components/productos";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur-md backdrop-saturate-150">
      <nav
        className="mx-auto flex h-15 max-w-5xl items-center justify-between px-6"
        aria-label="Principal"
      >
        <a href="#top" className="text-[17px] font-semibold tracking-tight">
          soytu
        </a>
        <div className="hidden gap-6 text-sm text-muted md:flex">
          <a href="#productos" className="transition-colors hover:text-fg">
            Productos
          </a>
          <a href="#como" className="transition-colors hover:text-fg">
            Cómo funciona
          </a>
          <a href="#contacto" className="transition-colors hover:text-fg">
            Contacto
          </a>
        </div>
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-fg bg-fg px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-85"
        >
          Hablemos
        </a>
      </nav>
    </header>
  );
}
