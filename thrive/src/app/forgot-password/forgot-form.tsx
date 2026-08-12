'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setDevLink(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json();
      // FR-09: the response is identical whether or not the account exists.
      setMessage(payload.data?.message ?? 'If an account matches that address, a recovery link has been issued.');
      if (payload.data?.devResetLink) setDevLink(payload.data.devResetLink);
    } catch {
      setMessage('The system is not reachable right now. Please try again shortly.');
    } finally {
      setPending(false);
    }
  }

  if (message) {
    return (
      <div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</div>

        {devLink && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-900">Development mode</p>
            <p className="mt-1 text-amber-800">
              No mail service is configured, so the recovery link is shown here. This never appears in production.
            </p>
            <Link href={devLink} className="mt-3 inline-block break-all font-mono text-xs text-csu-700 underline">
              {devLink}
            </Link>
          </div>
        )}

        <Link href="/login" className="btn-secondary mt-5 w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="email" className="field-label">
        Institutional email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="field-input"
        placeholder="juan.delacruz@carsu.edu.ph"
      />
      <button type="submit" className="btn-primary mt-5 w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Send recovery link'}
      </button>
    </form>
  );
}
