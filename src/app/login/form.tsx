'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEntrando(true);
    const { error } = await getSupabaseBrowser().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: clave,
    });
    setEntrando(false);
    if (error) {
      setError('Ese mail o esa contraseña no son correctos.');
      return;
    }
    // refresh para que el Server Component vuelva a leer la cookie recién puesta.
    router.replace('/');
    router.refresh();
  }

  const campo =
    'w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-fg';

  return (
    <form onSubmit={signIn} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${campo} mt-1.5`}
          required
        />
      </div>
      <div>
        <label htmlFor="clave" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="clave"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className={`${campo} mt-1.5`}
          required
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={entrando}
        className="w-full rounded-lg border border-fg bg-fg px-4 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {entrando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
