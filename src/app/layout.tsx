import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { RegistrarSW } from "@/components/registrar-sw";

/** La tipografía de la marca: Montserrat en toda la suite. */
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
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
