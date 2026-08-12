/** Account profile and permissions summary. */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionsFor, PERMISSIONS } from '@/lib/rbac';
import { Card, CardHeader, PageHeader, Badge, StatusPill, formatDateTime } from '@/components/ui';
import { ROLE_LABELS, type Role } from '@/lib/constants';

export const metadata: Metadata = { title: 'My Profile' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [profile, recentActivity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        schoolId: true,
        program: true,
        department: true,
        college: true,
        contactNo: true,
        advisingLoad: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { actorId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!profile) redirect('/login');

  const permissions = permissionsFor(profile.role);
  const isFaculty = profile.role === 'FACULTY_ADVISER';

  const details: [string, string | null][] = [
    ['Full name', `${profile.firstName} ${profile.lastName}`],
    ['Institutional email', profile.email],
    ['Role', ROLE_LABELS[profile.role as Role] ?? profile.role],
    [profile.role === 'STUDENT' ? 'Student number' : 'Employee number', profile.schoolId],
    ['Degree program', profile.program],
    ['Department', profile.department],
    ['College', profile.college],
    ['Contact number', profile.contactNo],
    ...(isFaculty ? ([['Advising capacity', `${profile.advisingLoad} thesis groups`]] as [string, string][]) : []),
    ['Account created', formatDateTime(profile.createdAt)],
    ['Last sign-in', profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : 'This is your first session'],
  ];

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your account details and the capabilities your role grants across the platform."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Account details" action={<StatusPill status={profile.status} />} />
          <dl className="divide-y divide-slate-100">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-3 px-5 py-3 text-sm">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value ?? 'Not set'}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-slate-100 p-5">
            <p className="text-sm text-slate-600">
              Profile fields such as department, program and advising capacity are maintained by the administrator.
              To change your password, sign out and use the account recovery link on the sign-in page.
            </p>
            <Link href="/forgot-password" className="btn-secondary btn-sm mt-3">
              Change my password
            </Link>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="What my role can do" />
            <div className="p-5">
              <p className="mb-3 text-sm text-slate-600">
                {permissions.length} capabilit{permissions.length === 1 ? 'y' : 'ies'} granted to{' '}
                {ROLE_LABELS[profile.role as Role]}.
              </p>
              <ul className="space-y-1.5">
                {permissions.map((permission) => (
                  <li key={permission} className="flex items-start gap-2 text-sm text-slate-700">
                    <span aria-hidden className="mt-0.5 text-csu-600">
                      ✔
                    </span>
                    <span>{PERMISSIONS[permission]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader title="My recent activity" />
            <ul className="divide-y divide-slate-100">
              {recentActivity.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-500">No recorded activity yet.</li>
              )}
              {recentActivity.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <Badge tone="neutral">{entry.action.replace(/_/g, ' ').toLowerCase()}</Badge>
                  <p className="mt-1.5 text-sm text-slate-700">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
