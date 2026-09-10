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
    <main className="flex min-h-dvh flex-col justify-center bg-white p-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-lg shadow-brand-600/25">
            PA
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-black">
            Pakko Amdavadi
          </h1>
          <p className="mt-1 text-ink-500">Sign in to see your deliveries</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-xl shadow-brand-900/10"
        >
          <label className="block">
            <span className="text-sm font-semibold text-black">Phone number</span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="username"
              required
              className="mt-1.5 w-full rounded-xl border border-ink-300 bg-white px-3.5 py-3.5 text-lg text-black tabular-nums outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-black">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1.5 w-full rounded-xl border border-ink-300 bg-white px-3.5 py-3.5 text-lg text-black outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-stop-50 px-3 py-2.5 text-sm font-medium text-stop-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-blue w-full py-3.5 text-lg shadow-lg shadow-brand-600/20"
          >
            {busy && <span className="pk-spinner" />}
            {busy ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
