import { LoginForm } from './form';

export const dynamic = 'force-dynamic';

/**
 * Puerta del superadmin.
 *
 * Tiene login propio, aunque la cuenta sea la misma que la de los otros
 * productos. No alcanza con mandar a app.soytuadmin.com: la cookie de sesión vive
 * en `.soytuadmin.com` y `soytu.com.ar` es OTRO dominio — el navegador no cruza
 * cookies entre dominios distintos.
 */
export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ 'sin-acceso'?: string }>;
}) {
  const sp = await searchParams;
  const sinAcceso = sp['sin-acceso'] === '1';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">SOY <span className="text-primary-tx">TU</span> · panel</h1>

      {sinAcceso ? (
        <p className="mt-4 text-muted">
          Tu cuenta no tiene acceso a este panel. Está reservado a los superadmin de soytu.
        </p>
      ) : (
        <p className="mt-4 text-muted">
          Entrá con tu cuenta de soytu. Es la misma que usás en los otros productos.
        </p>
      )}

      <LoginForm />
    </main>
  );
}
