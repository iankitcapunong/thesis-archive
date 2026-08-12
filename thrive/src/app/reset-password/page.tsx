import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ResetPasswordForm } from './reset-form';

export const metadata: Metadata = { title: 'Set a new password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-semibold text-slate-900">Set a new password</h1>
          {token ? (
            <>
              <p className="mt-1.5 text-sm text-slate-600">
                Choose a password of at least 10 characters. The recovery link can only be used once.
              </p>
              <div className="mt-6">
                <ResetPasswordForm token={token} />
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This recovery link is incomplete or has expired. Please request a new one.
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="hover:text-slate-700">
            Request a new recovery link
          </Link>
        </p>
      </div>
    </div>
  );
}
