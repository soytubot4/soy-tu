import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RegistrarSW } from "@/components/registrar-sw";

/**
 * La tipografía de la marca: Montserrat en toda la suite.
 *
 * Servida desde el repo y no con `next/font/google` a propósito. Ese loader
 * baja la fuente DURANTE EL BUILD, y el builder de DigitalOcean no llega a
 * fonts.gstatic.com: el deploy se cae entero con un "Module not found" de
 * `@vercel/turbopack-next/internal/font/google/font` que no dice nada de
 * fuentes ni de red. Con el archivo acá, el build no depende de que Google
 * esté arriba ni de que el builder tenga salida.
 *
 * Es el .woff2 variable del subset latin (35 KB) y cubre de 400 a 800, que son
 * los cinco pesos que usábamos. Para actualizarla: bajar de nuevo el `latin`
 * de https://fonts.googleapis.com/css2?family=Montserrat:wght@400..800
 */
const montserrat = localFont({
  src: "./fuentes/montserrat-latin.woff2",
  variable: "--font-montserrat",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SOY TU — El software de tu negocio, en partes",
  description:
    "Gestión, fidelidad, turnos, bar, bots de WhatsApp y contenido con IA. Una sola cuenta, prendés lo que necesitás.",
  keywords: [
    "gestión de stock",
    "punto de venta",
    "facturación AFIP",
    "programa de puntos",
    "turnos online",
    "sistema para bares",
    "chatbot WhatsApp",
  ],
};

export const viewport: Viewport = {
  themeColor: "#07071A",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${montserrat.variable} antialiased`}>
      <body className="font-sans">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
