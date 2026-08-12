/** Login screen (SRS Figure 6.2, FR-01 to FR-03). */

import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from './login-form';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen-dvh flex-col lg:flex-row">
      {/* Institutional panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-csu-800 via-csu-700 to-csu-600 px-5 py-8 text-white sm:px-6 sm:py-10 lg:w-[45%] lg:px-12 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 animate-float rounded-full bg-csu-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="animate-fade-right">
            <Logo href="/" inverted />
          </div>
          <div className="anim-delay-100 mt-8 animate-fade-up sm:mt-10 lg:mt-24">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              Thesis Hub for Research, Innovation, Validation and Evaluation
            </h1>
            <p className="mt-4 max-w-md text-sm text-csu-50 sm:text-base">
              One governed workspace for thesis registration, adviser assignment, document review, defense scheduling
              and institutional reporting.
            </p>
          </div>

          <div className="anim-delay-200 mt-8 animate-fade-up rounded-xl bg-white/10 p-4 ring-1 ring-white/15 sm:mt-10 sm:p-5 lg:mt-16">
            <p className="text-xs font-semibold uppercase tracking-wide text-csu-100">New to THRIVE?</p>
            <p className="mt-2 text-sm text-csu-50">
              Students can register with a Caraga State University email address. Adviser, panel, coordinator and
              administrator accounts are issued by the college.
            </p>
            <Link
              href="/signup"
              className="btn mt-4 border border-white/40 px-4 py-2 font-semibold text-white hover:border-white/70 hover:bg-white/10"
            >
              Create a student account
            </Link>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 pb-safe-6 sm:px-6 sm:py-12">
        <div className="w-full max-w-md animate-fade-up">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-600">Use your Caraga State University account credentials.</p>

          {params.reset === 'success' && (
            <div className="mt-5 animate-scale-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Your password has been updated. You may now sign in.
            </div>
          )}

          <div className="card mt-6 p-5 sm:p-6">
            <LoginForm nextPath={params.next} />
          </div>

          <p className="mt-5 text-center text-sm text-slate-600">
            No account yet?{' '}
            <Link href="/signup" className="link-underline font-medium text-csu-700 hover:text-csu-800">
              Create a student account
            </Link>
          </p>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="link-underline hover:text-slate-700">
              Return to the public site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
