/** Faculty adviser dashboard — FR-55. */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getAdviserWorkspace, documentSummary } from '@/lib/queries';
import { prisma } from '@/lib/prisma';
import { stageName } from '@/lib/workflow';
import { STAGES } from '@/lib/workflow';
import {
  Card, CardHeader, EmptyState, PageHeader, StatCard, StatusPill, Badge, ProgressBar, relativeTime, formatDateTime,
} from '@/components/ui';

export const metadata: Metadata = { title: 'Adviser Dashboard' };
export const dynamic = 'force-dynamic';

export default async function AdviserDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [{ theses, pendingRequests, reviewQueue }, upcomingDefenses, profile] = await Promise.all([
    getAdviserWorkspace(user.id),
    prisma.defenseSchedule.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
        OR: [{ thesis: { adviserId: user.id } }, { panelists: { some: { panelistId: user.id } } }],
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      include: { thesis: { select: { id: true, referenceNo: true, title: true } } },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { advisingLoad: true } }),
  ]);

  const capacity = profile?.advisingLoad ?? 0;
  const needingRevision = theses.reduce(
    (sum, t) => sum + t.documents.filter((d) => d.status === 'REVISE').length,
    0,
  );

  return (
    <>
      <PageHeader
        title={`Good day, ${user.firstName}`}
        description="Groups you supervise, submissions waiting on you, and your upcoming defense commitments."
        actions={
          reviewQueue.length > 0 && (
            <Link href="/adviser/reviews" className="btn-primary">
              Review {reviewQueue.length} submission{reviewQueue.length === 1 ? '' : 's'}
            </Link>
          )
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Advisees"
          value={`${theses.length}/${capacity}`}
          hint={theses.length >= capacity ? 'At capacity' : `${capacity - theses.length} slot(s) open`}
          tone={theses.length >= capacity ? 'warning' : 'success'}
        />
        <StatCard
          label="Awaiting my review"
          value={reviewQueue.length}
          hint={reviewQueue.length ? 'Action required' : 'All caught up'}
          tone={reviewQueue.length ? 'warning' : 'success'}
          href="/adviser/reviews"
        />
        <StatCard
          label="Adviser requests"
          value={pendingRequests}
          hint={pendingRequests ? 'Pending response' : 'None pending'}
          tone={pendingRequests ? 'info' : 'neutral'}
          href="/adviser/requests"
        />
        <StatCard label="Groups in revision" value={needingRevision} tone={needingRevision ? 'warning' : 'neutral'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="My thesis groups" />
          <div className="divide-y divide-slate-100">
            {theses.length === 0 && (
              <EmptyState
                title="You are not advising any group yet"
                description="Accepted adviser requests will appear here."
                action={
                  <Link href="/adviser/requests" className="btn-secondary">
                    View adviser requests
                  </Link>
                }
              />
            )}

            {theses.map((thesis) => {
              const approved = thesis.milestones.filter((m) => m.status === 'APPROVED').length;
              const summary = documentSummary(thesis.documents);
              return (
                <div key={thesis.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/theses/${thesis.id}`} className="font-medium text-slate-900 hover:text-csu-700">
                        {thesis.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {thesis.referenceNo} · {thesis.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join(', ')}
                      </p>
                    </div>
                    <Badge tone="brand">{stageName(thesis.currentStage)}</Badge>
                  </div>

                  <div className="mt-4">
                    <ProgressBar
                      percent={Math.round((approved / STAGES.length) * 100)}
                      label={`${approved} of ${STAGES.length} milestones approved`}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {summary.awaitingReview > 0 && <Badge tone="info">{summary.awaitingReview} awaiting review</Badge>}
                    {summary.needsRevision > 0 && <Badge tone="warning">{summary.needsRevision} in revision</Badge>}
                    {summary.approved > 0 && <Badge tone="success">{summary.approved} approved</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Review queue"
              action={
                reviewQueue.length > 0 && (
                  <Link href="/adviser/reviews" className="text-xs font-medium text-csu-700 hover:text-csu-800">
                    Open queue
                  </Link>
                )
              }
            />
            <div className="divide-y divide-slate-100">
              {reviewQueue.length === 0 && <EmptyState title="Nothing awaiting review" />}
              {reviewQueue.slice(0, 5).map((doc) => (
                <Link key={doc.id} href={`/theses/${doc.thesis.id}`} className="block p-4 hover:bg-slate-50">
                  <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {doc.thesis.referenceNo} · v{doc.version} · {relativeTime(doc.createdAt)}
                  </p>
                  <div className="mt-2">
                    <StatusPill status={doc.status} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Upcoming defenses" />
            <div className="divide-y divide-slate-100">
              {upcomingDefenses.length === 0 && <EmptyState title="No scheduled defenses" />}
              {upcomingDefenses.map((defense) => (
                <div key={defense.id} className="p-4">
                  <Badge tone="info">{defense.defenseType === 'PROPOSAL' ? 'Proposal' : 'Final'}</Badge>
                  <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(defense.scheduledAt)}</p>
                  <p className="text-xs text-slate-500">
                    {defense.thesis.referenceNo} · {defense.venue}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
