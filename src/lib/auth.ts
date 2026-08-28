import { redirect } from 'next/navigation';
import { prisma } from './prisma';
import { getSupabaseServer } from './supabase/server';

/**
 * Deja pasar solo a un SUPERADMIN activo.
 *
 * No alcanza con estar logueado: acá se ven los comercios, los dueños y los
 * mails de TODOS los clientes. La verdad está en `admin_users`, la misma tabla
 * que ya usan los otros productos — no se confía en el JWT, que puede traer
 * metadata vieja.
 */
export async function requireSuperAdmin() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/entrar');

  const admin = await prisma.adminUser.findUnique({
    where: { supabaseUserId: user.id },
    select: { type: true, active: true, fullName: true, email: true },
  });

  if (!admin?.active || admin.type !== 'SUPERADMIN') redirect('/entrar?sin-acceso=1');

  return admin;
}
