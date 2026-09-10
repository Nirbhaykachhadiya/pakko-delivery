'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) return setError(data.error || 'Could not sign in');

    router.push(data.user.role === 'admin' ? '/admin' : '/delivery');
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-ink-900 p-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-200 text-lg font-bold text-brand-900">
            PA
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Pakko Amdavadi</h1>
          <p className="mt-1 text-brand-100">Sign in to see your deliveries</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5">
          <label className="block">
            <span className="text-sm font-medium text-ink-700">Phone number</span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded-xl border border-ink-300 px-3.5 py-3.5 text-lg tabular-nums outline-none focus:border-brand-600"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-xl border border-ink-300 px-3.5 py-3.5 text-lg outline-none focus:border-brand-600"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-stop-50 px-3 py-2.5 text-sm text-stop-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 py-3.5 text-lg font-semibold text-white active:bg-brand-700 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
