export const dynamic = 'force-dynamic';

/**
 * Puerta del superadmin.
 *
 * No tiene formulario propio a propósito: la sesión es la misma que la de los
 * otros productos, así que se entra por el login que ya existe y se vuelve acá.
 * Un formulario más sería otra pantalla de contraseña para mantener.
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
      <h1 className="text-2xl font-semibold tracking-tight">soytu · panel</h1>

      {sinAcceso ? (
        <p className="mt-4 text-muted">
          Tu cuenta no tiene acceso a este panel. Está reservado a los superadmin de soytu.
        </p>
      ) : (
        <p className="mt-4 text-muted">
          Entrá con tu cuenta de soytu y volvé acá. Es la misma sesión que usás en los otros
          productos.
        </p>
      )}

      <a
        href="https://app.soytuadmin.com"
        className="mt-8 rounded-lg border border-fg bg-fg px-4 py-3 text-center text-sm font-medium text-bg transition-opacity hover:opacity-85"
      >
        Ir a iniciar sesión
      </a>
    </main>
  );
}
