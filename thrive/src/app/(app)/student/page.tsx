/** Student dashboard — FR-54 (SRS Figures 6.3 and 6.4). */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getStudentThesis, documentSummary } from '@/lib/queries';
import { requirementsFor, stageName, getStage } from '@/lib/workflow';
import { prisma } from '@/lib/prisma';
import {
  Badge, Card, CardHeader, EmptyState, PageHeader, StatCard, StatusPill,
  formatDate, formatDateTime, relativeTime,
} from '@/components/ui';
import { MilestoneTrack } from '@/components/milestone-track';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'My Thesis' };
export const dynamic = 'force-dynamic';

export default async function StudentDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const thesis = await getStudentThesis(user.id);

  if (!thesis) {
    return (
      <>
        <PageHeader
          title={`Welcome, ${user.firstName}`}
          description="You have not registered a thesis project yet. Registration opens the milestone plan and lets you request a faculty adviser."
        />
        <Card>
          <EmptyState
            title="No thesis project registered"
            description="Register your working title and group members to begin the thesis workflow. You can refine the title and abstract at any time before the proposal defense."
            action={
              <Link href="/student/register" className="btn-primary">
                Register a thesis project
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const summary = documentSummary(thesis.documents);
  const stage = getStage(thesis.currentStage);
  const requirements = requirementsFor(thesis.currentStage);
  const currentDocs = thesis.documents.filter((d) => d.milestoneId === thesis.milestones.find((m) => m.stageKey === thesis.currentStage)?.id);
  const upcomingDefense = thesis.defenses.find((d) => d.status === 'SCHEDULED' && d.scheduledAt >= new Date());
  const pendingRequest = thesis.adviserRequests.find((r) => r.status === 'PENDING');

  const outstanding = requirements.filter((req) => {
    const doc = currentDocs.find((d) => d.requirementKey === req.key);
    return !doc || doc.status !== 'APPROVED';
  });

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.firstName}`}
        description={`${thesis.referenceNo} · ${stageName(thesis.currentStage)}`}
        actions={
          <Link href={`/theses/${thesis.id}`} className="btn-primary">
            Open thesis workspace
          </Link>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current stage" value={stageName(thesis.currentStage)} hint={thesis.status} tone="brand" />
        <StatCard label="Documents approved" value={`${summary.approved}/${summary.total}`} />
        <StatCard
          label="Awaiting adviser review"
          value={summary.awaitingReview}
          hint={summary.awaitingReview ? 'In review' : 'Nothing pending'}
          tone={summary.awaitingReview ? 'info' : 'success'}
        />
        <StatCard
          label="Needs revision"
          value={summary.needsRevision}
          hint={summary.needsRevision ? 'Action required' : 'All clear'}
          tone={summary.needsRevision ? 'warning' : 'success'}
        />
      </div>

      {/* Adviser status banner */}
      {!thesis.adviserId && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Icon name="warning" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">
                {pendingRequest ? 'Adviser request pending' : 'No adviser assigned yet'}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {pendingRequest
                  ? `Your request to ${pendingRequest.adviser.firstName} ${pendingRequest.adviser.lastName} was sent ${relativeTime(pendingRequest.createdAt)} and is awaiting a response.`
                  : 'Document review and defense scheduling only begin once a faculty adviser has accepted your group.'}
              </p>
              {!pendingRequest && (
                <Link href="/student/adviser" className="btn-primary btn-sm mt-3">
                  Find an adviser
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Progress */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Thesis progress"
            action={<Badge tone="brand">{thesis.academicYear}</Badge>}
          />
          <div className="p-5">
            <h3 className="text-base font-semibold leading-snug text-slate-900">{thesis.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {thesis.program} · {thesis.department}
            </p>
            <div className="mt-6">
              <MilestoneTrack milestones={thesis.milestones} currentStage={thesis.currentStage} />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Requirements for the current stage */}
          <Card>
            <CardHeader title="Current stage requirements" />
            <div className="p-5">
              <p className="mb-4 text-sm text-slate-600">{stage?.description}</p>
              <ul className="space-y-3">
                {requirements.map((req) => {
                  const doc = currentDocs.find((d) => d.requirementKey === req.key);
                  return (
                    <li key={req.key} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{req.label}</p>
                        <p className="text-xs text-slate-500">
                          {doc ? `Version ${doc.version} · submitted ${formatDate(doc.createdAt)}` : 'Not yet submitted'}
                        </p>
                      </div>
                      {doc ? <StatusPill status={doc.status} /> : <Badge tone="neutral">Pending</Badge>}
                    </li>
                  );
                })}
              </ul>
              {outstanding.length > 0 && (
                <Link href={`/theses/${thesis.id}`} className="btn-primary btn-sm mt-5 w-full">
                  <Icon name="upload" className="h-4 w-4" />
                  Submit a document
                </Link>
              )}
            </div>
          </Card>

          {/* Defense */}
          <Card>
            <CardHeader title="Defense schedule" />
            <div className="p-5">
              {upcomingDefense ? (
                <div>
                  <Badge tone="info">{upcomingDefense.defenseType === 'PROPOSAL' ? 'Proposal defense' : 'Final defense'}</Badge>
                  <p className="mt-3 text-sm font-medium text-slate-900">{formatDateTime(upcomingDefense.scheduledAt)}</p>
                  <p className="mt-1 text-sm text-slate-600">{upcomingDefense.venue}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Panel: {thesis.panel.map((p) => `${p.panelist.firstName} ${p.panelist.lastName}`).join(', ') || 'To be assigned'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No defense is currently scheduled. Your research coordinator schedules defenses once the milestone
                  requirements are met.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent feedback and notifications */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent adviser feedback" />
          <div className="divide-y divide-slate-100">
            {thesis.documents.flatMap((doc) =>
              doc.evaluations.slice(0, 1).map((evaluation) => (
                <div key={evaluation.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                    <StatusPill status={evaluation.decision} />
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{evaluation.comments}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {evaluation.evaluator.firstName} {evaluation.evaluator.lastName} · {relativeTime(evaluation.createdAt)}
                  </p>
                </div>
              )),
            ).slice(0, 3)}
            {thesis.documents.every((d) => d.evaluations.length === 0) && (
              <EmptyState title="No feedback yet" description="Adviser and panel remarks will appear here once your submissions are reviewed." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Notifications"
            action={
              <Link href="/notifications" className="text-xs font-medium text-csu-700 hover:text-csu-800">
                View all
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 && <EmptyState title="No notifications yet" />}
            {notifications.map((n) => (
              <div key={n.id} className="flex gap-3 p-4">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-slate-300' : 'bg-csu-600'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{relativeTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
