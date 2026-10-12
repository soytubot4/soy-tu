import { WHATSAPP } from "@/components/productos";
import { LogoWordmark } from "@/components/logo";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur-md backdrop-saturate-150">
      <nav
        className="mx-auto flex h-15 max-w-5xl items-center justify-between px-6"
        aria-label="Principal"
      >
        <a href="#top" className="text-[17px]">
          <LogoWordmark />
        </a>
        <div className="hidden gap-6 text-sm text-muted-2 md:flex">
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
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          Hablemos
        </a>
      </nav>
    </header>
  );
}
