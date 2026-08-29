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
        setAll: (cookies) => {
          // En un Server Component esto tira: no se pueden escribir cookies
          // durante el render. Se intenta igual porque en Route Handlers sí
          // funciona, y ahí es donde importa refrescar el token.
          try {
            cookies.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* render: lo resuelve la proxima navegacion */
          }
        },
      },
    },
  );
}
