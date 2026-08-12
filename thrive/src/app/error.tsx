'use client';

/**
 * Global error boundary (FR-66, NFR-16).
 * Shows an actionable message; the underlying fault details stay server-side.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[thrive] render error', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">This page could not be displayed</h1>
        <p className="mt-3 text-slate-600">
          No changes were saved. You can retry the action, or return to your dashboard and try again from there.
        </p>
        {error.digest && <p className="mt-4 font-mono text-xs text-slate-400">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Go to my dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
