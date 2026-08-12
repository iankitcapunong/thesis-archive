/** Research coordinator dashboard — FR-56, FR-57. */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { buildAnalytics } from '@/lib/analytics';
import { prisma } from '@/lib/prisma';
import { stageName } from '@/lib/workflow';
import {
  Card, CardHeader, EmptyState, PageHeader, StatCard, StatusPill, Badge, ProgressBar, formatDateTime, relativeTime,
} from '@/components/ui';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'Coordinator Dashboard' };
export const dynamic = 'force-dynamic';

export default async function CoordinatorDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [analytics, unadvised, upcoming, staleReviews] = await Promise.all([
    buildAnalytics(user),
    prisma.thesisProject.findMany({
      where: { adviserId: null, status: { in: ['ACTIVE', 'DRAFT'] } },
      include: {
        members: { include: { user: { select: { firstName: true, lastName: true } } } },
        adviserRequests: { where: { status: 'PENDING' }, select: { id: true } },
      },
      take: 10,
    }),
    prisma.defenseSchedule.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: 6,
      include: { thesis: { select: { id: true, referenceNo: true, title: true } } },
    }),
    prisma.document.findMany({
      where: {
        isCurrent: true,
        status: 'UNDER_REVIEW',
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
      take: 8,
      include: {
        thesis: { select: { id: true, referenceNo: true, adviser: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  const { totals, stageDistribution, compliance } = analytics;

  return (
    <>
      <PageHeader
        title="Coordination overview"
        description="Thesis activity across your scope, with the items that need coordinator action surfaced first."
        actions={
          <>
            <Link href="/coordinator/schedules" className="btn-primary">
              Schedule a defense
            </Link>
            <Link href="/reports" className="btn-secondary">
              Generate reports
            </Link>
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active projects" value={totals.active} hint={`${totals.all} total`} />
        <StatCard label="Completion rate" value={`${totals.completionRate}%`} hint={`${totals.completed + totals.archived} finished`} tone="success" />
        <StatCard
          label="Groups without an adviser"
          value={compliance.unadvisedGroups}
          hint={compliance.unadvisedGroups ? 'Needs attention' : 'All assigned'}
          tone={compliance.unadvisedGroups ? 'warning' : 'success'}
        />
        <StatCard
          label="Reviews over 7 days old"
          value={compliance.overdueReviews}
          hint={compliance.overdueReviews ? 'Follow up with advisers' : 'Within target'}
          tone={compliance.overdueReviews ? 'danger' : 'success'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Projects by workflow stage" />
          <div className="space-y-4 p-5">
            {stageDistribution.map((stage) => (
              <div key={stage.key}>
                <ProgressBar
                  percent={totals.all ? Math.round((stage.count / totals.all) * 100) : 0}
                  label={`${stage.name} — ${stage.count} group${stage.count === 1 ? '' : 's'}`}
                />
              </div>
            ))}
            {totals.all === 0 && <EmptyState title="No thesis projects registered yet" />}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming defenses"
            action={
              <Link href="/coordinator/schedules" className="text-xs font-medium text-csu-700 hover:text-csu-800">
                Manage
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {upcoming.length === 0 && <EmptyState title="No defenses scheduled" />}
            {upcoming.map((defense) => (
              <div key={defense.id} className="p-4">
                <Badge tone="info">{defense.defenseType === 'PROPOSAL' ? 'Proposal' : 'Final'}</Badge>
                <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(defense.scheduledAt)}</p>
                <Link href={`/theses/${defense.thesis.id}`} className="mt-0.5 block truncate text-xs text-csu-700 hover:text-csu-800">
                  {defense.thesis.referenceNo} — {defense.thesis.title}
                </Link>
                <p className="text-xs text-slate-500">{defense.venue}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Groups without an adviser (${unadvised.length})`} />
          <div className="divide-y divide-slate-100">
            {unadvised.length === 0 && <EmptyState title="Every active group has an adviser" />}
            {unadvised.map((thesis) => (
              <div key={thesis.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/theses/${thesis.id}`} className="text-sm font-medium text-slate-900 hover:text-csu-700">
                    {thesis.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {thesis.referenceNo} · {thesis.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join(', ')}
                  </p>
                </div>
                {thesis.adviserRequests.length > 0 ? (
                  <Badge tone="info">{thesis.adviserRequests.length} pending request</Badge>
                ) : (
                  <Badge tone="warning">No request sent</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Reviews awaiting action for over a week"
            action={<Icon name="clock" className="h-4 w-4 text-slate-400" />}
          />
          <div className="divide-y divide-slate-100">
            {staleReviews.length === 0 && <EmptyState title="No overdue reviews" description="All submissions are being reviewed within the target window." />}
            {staleReviews.map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/theses/${doc.thesis.id}`} className="text-sm font-medium text-slate-900 hover:text-csu-700">
                    {doc.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {doc.thesis.referenceNo} · adviser:{' '}
                    {doc.thesis.adviser ? `${doc.thesis.adviser.firstName} ${doc.thesis.adviser.lastName}` : 'unassigned'}
                  </p>
                </div>
                <Badge tone="danger">Waiting {relativeTime(doc.createdAt)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Adviser workload" action={<Link href="/reports" className="text-xs font-medium text-csu-700 hover:text-csu-800">Export</Link>} />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Adviser</th>
                <th>Department</th>
                <th>Groups</th>
                <th>Utilisation</th>
                <th>Awaiting review</th>
              </tr>
            </thead>
            <tbody>
              {analytics.adviserWorkload.map((adviser) => (
                <tr key={adviser.id}>
                  <td className="font-medium">{adviser.name}</td>
                  <td className="text-xs">{adviser.department}</td>
                  <td>
                    {adviser.activeGroups} / {adviser.capacity}
                  </td>
                  <td className="w-48">
                    <ProgressBar percent={adviser.utilisation} label="" />
                  </td>
                  <td>
                    {adviser.pendingReviews > 0 ? (
                      <StatusPill status="UNDER_REVIEW" />
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}{' '}
                    {adviser.pendingReviews > 0 && <span className="text-xs">{adviser.pendingReviews}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-slate-400">
        Stage summary: {stageDistribution.map((s) => `${stageName(s.key)} (${s.count})`).join(' · ')}
      </p>
    </>
  );
}
