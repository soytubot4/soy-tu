'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente del browser. MISMO proyecto Supabase que el resto de los productos,
 * así que se entra con la cuenta de siempre.
 *
 * Ojo: la cookie NO se comparte con soytuadmin.com — es otro dominio, y el
 * navegador no cruza cookies entre dominios distintos. Por eso este panel tiene
 * su propio login aunque la cuenta sea la misma.
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
