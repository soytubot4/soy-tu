'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await getSupabaseBrowser().auth.signOut();
        router.replace('/login');
        router.refresh();
      }}
      className="text-[13px] text-muted underline transition-colors hover:text-fg"
    >
      Salir
    </button>
  );
}
