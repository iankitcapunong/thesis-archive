/** Student self-registration (FR-06). */

import Link from 'next/link';
import type { Metadata } from 'next';
import { SignupForm } from './signup-form';
import { Logo } from '@/components/logo';
import { GoogleButton } from '@/components/google-button';
import { isGoogleEnabled } from '@/lib/google';
import { INSTITUTIONAL_EMAIL_DOMAIN } from '@/lib/constants';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen-dvh flex-col lg:flex-row">
      {/* Institutional panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-csu-800 via-csu-700 to-csu-600 px-5 py-8 text-white sm:px-6 sm:py-10 lg:w-[42%] lg:px-12 lg:py-16">
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
              Create your THRIVE account
            </h1>
            <p className="mt-4 max-w-md text-sm text-csu-50 sm:text-base">
              Register with your Caraga State University address to start your thesis project, request a faculty
              adviser and track every milestone through to archiving.
            </p>
          </div>

          <ul className="anim-delay-200 mt-8 animate-fade-up space-y-3 text-sm sm:mt-10 lg:mt-16">
            {[
              `Open to holders of an @${INSTITUTIONAL_EMAIL_DOMAIN} address`,
              'Register your working title and group members',
              'Submit documents and follow adviser feedback in one place',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-0.5 text-gold-400">
                  ✔
                </span>
                <span className="text-csu-50">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 pb-safe-6 sm:px-6 sm:py-12">
        <div className="w-full max-w-lg animate-fade-up">
          <h2 className="text-2xl font-semibold text-slate-900">Sign up</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="link-underline font-medium text-csu-700 hover:text-csu-800">
              Sign in instead
            </Link>
            .
          </p>

          <div className="card mt-6 p-5 sm:p-6">
            <SignupForm />
            {isGoogleEnabled() && <GoogleButton />}
          </div>

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
