import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Sesión del visitante.
 *
 * Es el MISMO proyecto Supabase que el resto de los productos: el que ya está
 * logueado en soytuadmin entra acá sin volver a autenticarse.
 */
export async function getSupabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: () => {
          // Server Component: no puede escribir cookies. Este panel solo lee.
        },
      },
    },
  );
}
