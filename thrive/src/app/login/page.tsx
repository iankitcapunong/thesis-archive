/** Login screen (SRS Figure 6.2, FR-01 to FR-03). */

import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from './login-form';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Sign in' };

const DEMO_ACCOUNTS = [
  ['Student', 'student@carsu.edu.ph'],
  ['Faculty Adviser', 'adviser@carsu.edu.ph'],
  ['Panel Member', 'panel@carsu.edu.ph'],
  ['Research Coordinator', 'coordinator@carsu.edu.ph'],
  ['Department Chair', 'chair@carsu.edu.ph'],
  ['College Administrator', 'dean@carsu.edu.ph'],
  ['Administrator', 'admin@carsu.edu.ph'],
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Institutional panel */}
      <div className="bg-gradient-to-br from-csu-800 via-csu-700 to-csu-600 px-6 py-10 text-white lg:w-[45%] lg:px-12 lg:py-16">
        <Logo href="/" inverted />
        <div className="mt-10 lg:mt-24">
          <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">
            Thesis Hub for Research, Innovation, Validation and Evaluation
          </h1>
          <p className="mt-4 max-w-md text-csu-50">
            One governed workspace for thesis registration, adviser assignment, document review, defense scheduling
            and institutional reporting.
          </p>
        </div>

        <div className="mt-10 rounded-xl bg-white/10 p-5 ring-1 ring-white/15 lg:mt-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-csu-100">Demo accounts</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {DEMO_ACCOUNTS.map(([role, email]) => (
              <li key={email} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                <span className="text-csu-100">{role}</span>
                <span className="font-mono text-[13px]">{email}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/15 pt-3 text-sm">
            Password for all demo accounts: <span className="font-mono font-semibold">Thrive@2027</span>
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-600">Use your Caraga State University account credentials.</p>

          {params.reset === 'success' && (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Your password has been updated. You may now sign in.
            </div>
          )}

          <div className="card mt-6 p-6">
            <LoginForm nextPath={params.next} />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-700">
              Return to the public site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
