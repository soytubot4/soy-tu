import { EMAIL, WHATSAPP } from "@/components/productos";

export function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted sm:py-14">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <span>
          &copy; {new Date().getFullYear()} SOY <span className="text-primary-tx">TU</span>
        </span>
        <span className="flex gap-4">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-fg"
          >
            WhatsApp
          </a>
          <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-fg">
            Email
          </a>
        </span>
      </div>
    </footer>
  );
}
