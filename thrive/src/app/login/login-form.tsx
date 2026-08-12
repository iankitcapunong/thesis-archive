'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui';

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        // FR-01: a generic message that never reveals which field was wrong.
        setError(payload.error ?? 'Unable to sign in. Please try again.');
        setPending(false);
        return;
      }

      router.push(nextPath && nextPath.startsWith('/') ? nextPath : payload.data.redirectTo);
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please check your connection and try again.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && (
        <div
          role="alert"
          className="mb-4 animate-fade-down rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="field-label">
          Institutional email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input"
          placeholder="juan.delacruz@carsu.edu.ph"
        />
      </div>

      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="field-label mb-0">
            Password
          </label>
          <Link href="/forgot-password" className="link-underline text-xs font-medium text-csu-700 hover:text-csu-800">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input"
          placeholder="••••••••"
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
