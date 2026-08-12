import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ForgotPasswordForm } from './forgot-form';

export const metadata: Metadata = { title: 'Account recovery' };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-semibold text-slate-900">Recover your account</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Enter your institutional email address. If an active account exists, a time-bound recovery link will be
            issued.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="hover:text-slate-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
