/** Not-found recovery page (NFR-16). */

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen-dvh items-center justify-center bg-slate-50 px-5 py-12 sm:px-6">
      <div className="w-full max-w-lg animate-fade-up text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">404 · Not found</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">We could not find that page</h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          The record may have been moved, archived, or the link may be incorrect.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/dashboard" className="btn-primary">
            Go to my dashboard
          </Link>
          <Link href="/" className="btn-secondary">
            Return to the public site
          </Link>
        </div>
      </div>
    </main>
  );
}
