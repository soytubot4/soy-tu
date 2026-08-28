"use client";

import { useEffect } from "react";

/**
 * Registra el service worker que deja el sitio cacheado.
 *
 * Va después del load a propósito: registrarlo antes le compite ancho de banda
 * al primer render, que es justo lo que se quiere rápido.
 *
 * En desarrollo no se registra: un service worker sirviendo assets viejos
 * mientras se edita es la forma más rápida de perder una hora buscando un bug
 * que no existe.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla, el sitio anda igual: esto solo lo hace más rápido.
      });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
