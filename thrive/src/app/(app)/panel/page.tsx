/** Panel member dashboard — evaluation duties and defense commitments. */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getPanelWorkspace } from '@/lib/queries';
import { stageName } from '@/lib/workflow';
import { formatBytes } from '@/lib/storage';
import {
  Card, CardHeader, EmptyState, PageHeader, StatCard, StatusPill, Badge, formatDateTime, relativeTime,
} from '@/components/ui';
import { Icon } from '@/components/icons';
import { EvaluationForm } from '@/app/(app)/theses/[id]/evaluation-form';

export const metadata: Metadata = { title: 'Panel Dashboard' };
export const dynamic = 'force-dynamic';

export default async function PanelDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { assignments, upcoming, reviewQueue } = await getPanelWorkspace(user.id);
  const nextDefense = upcoming[0];

  return (
    <>
      <PageHeader
        title={`Good day, ${user.firstName}`}
        description="Thesis groups where you serve on the defense panel, and submissions awaiting your evaluation."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard label="Panel assignments" value={assignments.length} />
        <StatCard
          label="Upcoming defenses"
          value={upcoming.length}
          hint={nextDefense ? formatDateTime(nextDefense.scheduledAt) : 'None scheduled'}
          tone={upcoming.length ? 'info' : 'neutral'}
          href="/panel/schedules"
        />
        <StatCard
          label="Awaiting my evaluation"
          value={reviewQueue.length}
          hint={reviewQueue.length ? 'Action required' : 'All caught up'}
          tone={reviewQueue.length ? 'warning' : 'success'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Submissions awaiting evaluation" />
          <div className="divide-y divide-slate-100">
            {reviewQueue.length === 0 && (
              <EmptyState
                title="Nothing awaiting your evaluation"
                description="Documents from your assigned groups appear here when they are submitted for review."
              />
            )}

            {reviewQueue.map((doc) => (
              <div key={doc.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/theses/${doc.thesis.id}`} className="font-medium text-slate-900 hover:text-csu-700">
                      {doc.thesis.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {doc.thesis.referenceNo} · {doc.milestone.name}
                    </p>
                  </div>
                  <StatusPill status={doc.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {doc.title} <span className="text-slate-400">· v{doc.version}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Submitted {relativeTime(doc.createdAt)} · {formatBytes(doc.sizeBytes)}
                    </p>
                  </div>
                  <a href={`/api/documents/${doc.id}/download`} className="btn-secondary btn-sm shrink-0">
                    <Icon name="download" className="h-4 w-4" />
                    Download
                  </a>
                </div>

                <div className="mt-3">
                  <EvaluationForm documentId={doc.id} documentTitle={`${doc.title} (v${doc.version})`} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Upcoming defenses"
              action={
                <Link href="/panel/schedules" className="text-xs font-medium text-csu-700 hover:text-csu-800">
                  View all
                </Link>
              }
            />
            <div className="divide-y divide-slate-100">
              {upcoming.length === 0 && <EmptyState title="No scheduled defenses" />}
              {upcoming.slice(0, 4).map((defense) => (
                <div key={defense.id} className="p-4">
                  <Badge tone="info">{defense.defenseType === 'PROPOSAL' ? 'Proposal' : 'Final'}</Badge>
                  <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(defense.scheduledAt)}</p>
                  <p className="text-xs text-slate-500">{defense.venue}</p>
                  <Link href={`/theses/${defense.thesis.id}`} className="mt-1 block truncate text-xs text-csu-700 hover:text-csu-800">
                    {defense.thesis.referenceNo} — {defense.thesis.title}
                  </Link>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="My panel assignments" />
            <div className="divide-y divide-slate-100">
              {assignments.length === 0 && <EmptyState title="No panel assignments yet" />}
              {assignments.map((assignment) => (
                <Link key={assignment.id} href={`/theses/${assignment.thesis.id}`} className="block p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium text-slate-900">{assignment.thesis.title}</p>
                    {assignment.panelRole === 'CHAIR' && <Badge tone="info">Chair</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {assignment.thesis.referenceNo} · {stageName(assignment.thesis.currentStage)}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
