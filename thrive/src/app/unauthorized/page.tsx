/** Unauthorized access page (FR-12, NFR-16) — always offers a way forward. */

import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { homeRouteFor } from '@/lib/rbac';
import { ROLE_LABELS, type Role } from '@/lib/constants';

export const metadata: Metadata = { title: 'Access denied' };

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">403 · Access denied</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">This area is outside your permissions</h1>
        <p className="mt-3 text-slate-600">
          {user
            ? `You are signed in as ${user.firstName} ${user.lastName} (${ROLE_LABELS[user.role as Role] ?? user.role}). This page belongs to a different role.`
            : 'Your session is no longer active. Please sign in again to continue.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <>
              <Link href={homeRouteFor(user.role)} className="btn-primary">
                Go to my dashboard
              </Link>
              <Link href="/notifications" className="btn-secondary">
                View notifications
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
          )}
        </div>
        <p className="mt-8 text-sm text-slate-500">
          If you believe you should have access, contact your research coordinator or the system administrator.
        </p>
      </div>
    </main>
  );
}
