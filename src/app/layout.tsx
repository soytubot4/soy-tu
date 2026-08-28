import type { Metadata } from "next";
import "./globals.css";
import { RegistrarSW } from "@/components/registrar-sw";

export const metadata: Metadata = {
  title: "soytu — El software de tu negocio",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="antialiased">
      <body className="font-sans">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
