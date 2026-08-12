/** Administrator dashboard. */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildAnalytics } from '@/lib/analytics';
import { Card, CardHeader, EmptyState, PageHeader, StatCard, Badge, relativeTime } from '@/components/ui';
import { ALL_ROLES, ROLE_LABELS, type Role } from '@/lib/constants';

export const metadata: Metadata = { title: 'Administration' };
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [analytics, usersByRole, inactiveCount, recentLogins, recentAudit] = await Promise.all([
    buildAnalytics(user),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count({ where: { status: { not: 'ACTIVE' } } }),
    prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: 'desc' },
      take: 6,
      select: { id: true, firstName: true, lastName: true, role: true, lastLoginAt: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { actor: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const roleCounts = new Map(usersByRole.map((r) => [r.role, r._count._all]));
  const totalUsers = usersByRole.reduce((sum, r) => sum + r._count._all, 0);

  return (
    <>
      <PageHeader
        title="System administration"
        description="Accounts, roles, permissions and the institutional audit trail."
        actions={
          <>
            <Link href="/admin/users" className="btn-primary">
              Manage users
            </Link>
            <Link href="/admin/audit" className="btn-secondary">
              Audit trail
            </Link>
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total accounts" value={totalUsers} href="/admin/users" />
        <StatCard
          label="Inactive accounts"
          value={inactiveCount}
          tone={inactiveCount ? 'warning' : 'success'}
          hint={inactiveCount ? 'Cannot sign in' : 'All active'}
        />
        <StatCard label="Thesis projects" value={analytics.totals.all} hint={`${analytics.totals.active} active`} />
        <StatCard label="Completion rate" value={`${analytics.totals.completionRate}%`} tone="success" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Accounts by role" action={<Link href="/admin/roles" className="text-xs font-medium text-csu-700 hover:text-csu-800">Permissions</Link>} />
          <ul className="divide-y divide-slate-100">
            {ALL_ROLES.map((role) => (
              <li key={role} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-700">{ROLE_LABELS[role as Role]}</span>
                <Badge tone="neutral">{roleCounts.get(role) ?? 0}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Recent sign-ins" />
          <ul className="divide-y divide-slate-100">
            {recentLogins.length === 0 && <EmptyState title="No sign-ins recorded" />}
            {recentLogins.map((account) => (
              <li key={account.id} className="px-5 py-3">
                <p className="text-sm font-medium text-slate-900">
                  {account.firstName} {account.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {ROLE_LABELS[account.role as Role]} · {relativeTime(account.lastLoginAt!)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Latest audit entries"
            action={
              <Link href="/admin/audit" className="text-xs font-medium text-csu-700 hover:text-csu-800">
                View all
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {recentAudit.length === 0 && <EmptyState title="No audit entries" />}
            {recentAudit.map((entry) => (
              <li key={entry.id} className="px-5 py-3">
                <p className="text-sm text-slate-700">{entry.summary}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'System'} ·{' '}
                  {relativeTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
