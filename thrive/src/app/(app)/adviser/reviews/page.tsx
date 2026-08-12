/** Adviser review queue — FR-35 to FR-38 in one place. */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBytes } from '@/lib/storage';
import { Card, CardHeader, EmptyState, PageHeader, StatusPill, Badge, relativeTime } from '@/components/ui';
import { Icon } from '@/components/icons';
import { EvaluationForm } from '@/app/(app)/theses/[id]/evaluation-form';
import { DOCUMENT_STATUS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Review Queue' };
export const dynamic = 'force-dynamic';

export default async function ReviewQueuePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const isPanelist = user.role === 'PANEL_MEMBER';

  const documents = await prisma.document.findMany({
    where: {
      isCurrent: true,
      status: { in: [DOCUMENT_STATUS.UNDER_REVIEW, DOCUMENT_STATUS.PENDING] },
      thesis: isPanelist ? { panel: { some: { panelistId: user.id } } } : { adviserId: user.id },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      thesis: { select: { id: true, referenceNo: true, title: true } },
      milestone: { select: { name: true } },
      uploadedBy: { select: { firstName: true, lastName: true } },
      evaluations: {
        orderBy: { createdAt: 'desc' },
        take: 2,
        include: { evaluator: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Review queue"
        description={
          isPanelist
            ? 'Submissions from thesis groups where you serve on the defense panel.'
            : 'Submissions from your advisees, oldest first. Recording a decision notifies the group immediately.'
        }
      />

      {documents.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing is waiting on you"
            description="New submissions appear here as soon as a group uploads a document for the current milestone."
            action={
              <Link href={isPanelist ? '/panel' : '/adviser'} className="btn-secondary">
                Back to dashboard
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader
                title={doc.thesis.referenceNo}
                action={
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{doc.milestone.name}</Badge>
                    <StatusPill status={doc.status} />
                  </div>
                }
              />
              <div className="p-5">
                <Link href={`/theses/${doc.thesis.id}`} className="font-medium text-slate-900 hover:text-csu-700">
                  {doc.thesis.title}
                </Link>

                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {doc.title} <span className="text-slate-400">· v{doc.version}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {doc.uploadedBy.firstName} {doc.uploadedBy.lastName} · {relativeTime(doc.createdAt)} ·{' '}
                      {formatBytes(doc.sizeBytes)}
                    </p>
                  </div>
                  <a href={`/api/documents/${doc.id}/download`} className="btn-secondary btn-sm shrink-0">
                    <Icon name="download" className="h-4 w-4" />
                    Download
                  </a>
                </div>

                {doc.evaluations.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Previous remarks</p>
                    <ul className="mt-2 space-y-2">
                      {doc.evaluations.map((evaluation) => (
                        <li key={evaluation.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={evaluation.decision} />
                            <span className="text-xs text-slate-500">
                              {evaluation.evaluator.firstName} {evaluation.evaluator.lastName} ·{' '}
                              {relativeTime(evaluation.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-line text-slate-700">{evaluation.comments}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4">
                  <EvaluationForm documentId={doc.id} documentTitle={`${doc.title} (v${doc.version})`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
