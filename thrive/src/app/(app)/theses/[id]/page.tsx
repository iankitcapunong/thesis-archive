/**
 * Thesis workspace — the single record every role works from.
 * Covers FR-22, FR-29 to FR-45, FR-48 with visibility governed by
 * resolveThesisAccess (SRS 4.5.3).
 */

import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveThesisAccess } from '@/lib/access';
import { requirementsFor, stageName, getStage, evaluateMilestoneGate } from '@/lib/workflow';
import { can } from '@/lib/rbac';
import {
  Badge, Card, CardHeader, EmptyState, PageHeader, StatusPill,
  formatDate, formatDateTime, relativeTime,
} from '@/components/ui';
import { MilestoneTrack } from '@/components/milestone-track';
import { Icon } from '@/components/icons';
import { formatBytes } from '@/lib/storage';
import { DocumentUpload } from './document-upload';
import { EvaluationForm } from './evaluation-form';
import { WorkflowActions } from './workflow-actions';
import { MemberManager } from './member-manager';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const thesis = await prisma.thesisProject.findUnique({ where: { id }, select: { referenceNo: true } });
  return { title: thesis?.referenceNo ?? 'Thesis' };
}

export default async function ThesisWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const access = await resolveThesisAccess(user, id);
  if (!access.canView) redirect('/unauthorized');

  const thesis = await prisma.thesisProject.findUnique({
    where: { id },
    include: {
      adviser: { select: { id: true, firstName: true, lastName: true, email: true } },
      members: {
        orderBy: { groupRole: 'asc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, schoolId: true } } },
      },
      panel: { include: { panelist: { select: { id: true, firstName: true, lastName: true } } } },
      milestones: { orderBy: { sequence: 'asc' } },
      documents: {
        orderBy: [{ requirementKey: 'asc' }, { version: 'desc' }],
        include: {
          uploadedBy: { select: { firstName: true, lastName: true } },
          milestone: { select: { stageKey: true, name: true } },
          evaluations: {
            orderBy: { createdAt: 'desc' },
            include: { evaluator: { select: { firstName: true, lastName: true, role: true } } },
          },
        },
      },
      defenses: {
        orderBy: { scheduledAt: 'desc' },
        include: { panelists: { include: { panelist: { select: { firstName: true, lastName: true } } } } },
      },
      archive: true,
    },
  });

  if (!thesis) notFound();

  const stage = getStage(thesis.currentStage);
  const currentMilestone = thesis.milestones.find((m) => m.stageKey === thesis.currentStage);
  const requirements = requirementsFor(thesis.currentStage);
  const currentDocs = thesis.documents.filter((d) => d.isCurrent && d.milestone.stageKey === thesis.currentStage);
  const relevantDefense = stage?.defenseType
    ? (thesis.defenses.find((d) => d.defenseType === stage.defenseType) ?? null)
    : null;

  const gate = evaluateMilestoneGate(
    thesis.currentStage,
    currentDocs.map((d) => ({ requirementKey: d.requirementKey, status: d.status })),
    relevantDefense,
  );

  // Group document history by requirement so revisions stay together (FR-33).
  const history = new Map<string, typeof thesis.documents>();
  for (const doc of thesis.documents) {
    const list = history.get(doc.requirementKey) ?? [];
    list.push(doc);
    history.set(doc.requirementKey, list);
  }

  const isFinished = thesis.status === 'COMPLETED' || thesis.status === 'ARCHIVED';

  return (
    <>
      <PageHeader
        title={thesis.title}
        description={`${thesis.referenceNo} · ${thesis.program} · AY ${thesis.academicYear}`}
        actions={
          <>
            <StatusPill status={thesis.status} />
            <Badge tone="brand">{stageName(thesis.currentStage)}</Badge>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Current stage */}
          <Card>
            <CardHeader
              title={`Current stage — ${stageName(thesis.currentStage)}`}
              action={currentMilestone && <StatusPill status={currentMilestone.status} />}
            />
            <div className="p-5">
              <p className="text-sm text-slate-600">{stage?.description}</p>

              {isFinished ? (
                <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  All milestones for this thesis have been completed
                  {thesis.completedAt ? ` on ${formatDate(thesis.completedAt)}` : ''}.
                </div>
              ) : (
                <ul className="mt-5 space-y-4">
                  {requirements.map((req) => {
                    const doc = currentDocs.find((d) => d.requirementKey === req.key);
                    return (
                      <li key={req.key} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{req.label}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{req.description}</p>
                          </div>
                          {doc ? <StatusPill status={doc.status} /> : <Badge tone="neutral">Not submitted</Badge>}
                        </div>

                        {doc && (
                          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                            <span>Version {doc.version}</span>
                            <span>·</span>
                            <span>{formatBytes(doc.sizeBytes)}</span>
                            <span>·</span>
                            <span>
                              {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}, {relativeTime(doc.createdAt)}
                            </span>
                            <a href={`/api/documents/${doc.id}/download`} className="btn-ghost btn-sm ml-auto">
                              <Icon name="download" className="h-4 w-4" />
                              Download
                            </a>
                          </div>
                        )}

                        {access.canUpload && (!doc || doc.status !== 'APPROVED') && (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <DocumentUpload
                              thesisId={thesis.id}
                              requirementKey={req.key}
                              requirementLabel={req.label}
                              isRevision={Boolean(doc)}
                            />
                          </div>
                        )}

                        {access.canEvaluate && doc && doc.status !== 'APPROVED' && (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <EvaluationForm documentId={doc.id} documentTitle={`${req.label} (v${doc.version})`} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          {/* Submission history */}
          <Card>
            <CardHeader title="Submission history" />
            <div className="divide-y divide-slate-100">
              {thesis.documents.length === 0 && (
                <EmptyState title="No documents submitted yet" description="Submissions for the current stage appear here with their full revision history." />
              )}

              {[...history.entries()].map(([requirementKey, docs]) => (
                <div key={requirementKey} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{docs[0].title}</p>
                    <Badge tone="neutral">{docs[0].milestone.name}</Badge>
                  </div>

                  <ul className="mt-3 space-y-3">
                    {docs.map((doc) => (
                      <li key={doc.id} className="rounded-lg bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">Version {doc.version}</span>
                          <StatusPill status={doc.status} />
                          {!doc.isCurrent && <Badge tone="neutral">Superseded</Badge>}
                          <span className="text-xs text-slate-500">{formatDateTime(doc.createdAt)}</span>
                          <a href={`/api/documents/${doc.id}/download`} className="btn-ghost btn-sm ml-auto">
                            <Icon name="download" className="h-4 w-4" />
                            {doc.fileName}
                          </a>
                        </div>

                        {doc.evaluations.length > 0 && (
                          <ul className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                            {doc.evaluations.map((evaluation) => (
                              <li key={evaluation.id} className="text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusPill status={evaluation.decision} />
                                  <span className="text-xs text-slate-600">
                                    {evaluation.evaluator.firstName} {evaluation.evaluator.lastName}
                                  </span>
                                  <span className="text-xs text-slate-400">{formatDateTime(evaluation.createdAt)}</span>
                                  {evaluation.score !== null && (
                                    <Badge tone="info">Score {evaluation.score}</Badge>
                                  )}
                                </div>
                                <p className="mt-1.5 whitespace-pre-line leading-relaxed text-slate-700">
                                  {evaluation.comments}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Milestone plan" />
            <div className="p-5">
              <MilestoneTrack milestones={thesis.milestones} currentStage={thesis.currentStage} />
            </div>
          </Card>

          {(access.canManageWorkflow || can(user.role, 'archive.create')) && !isFinished && (
            <WorkflowActions
              thesisId={thesis.id}
              stageLabel={stageName(thesis.currentStage)}
              canAdvance={access.canManageWorkflow}
              gate={gate}
            />
          )}

          {thesis.status === 'COMPLETED' && can(user.role, 'archive.create') && !thesis.archive && (
            <WorkflowActions thesisId={thesis.id} stageLabel="Completion" canAdvance={false} gate={gate} showArchive />
          )}

          <Card>
            <CardHeader title="Project details" />
            <dl className="divide-y divide-slate-100 text-sm">
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-medium text-slate-900">{thesis.referenceNo}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Department</dt>
                <dd className="text-right font-medium text-slate-900">{thesis.department}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Adviser</dt>
                <dd className="text-right font-medium text-slate-900">
                  {thesis.adviser ? `${thesis.adviser.firstName} ${thesis.adviser.lastName}` : 'Not yet assigned'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Registered</dt>
                <dd className="font-medium text-slate-900">{formatDate(thesis.createdAt)}</dd>
              </div>
            </dl>

            {thesis.abstract && (
              <div className="border-t border-slate-100 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Abstract</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{thesis.abstract}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={`Group members (${thesis.members.length})`} />
            <ul className="divide-y divide-slate-100">
              {thesis.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{member.user.schoolId ?? member.user.email}</p>
                  </div>
                  {member.groupRole === 'LEADER' && <Badge tone="brand">Leader</Badge>}
                </li>
              ))}
            </ul>
            {access.canManageMembers && !isFinished && (
              <div className="border-t border-slate-100 p-4">
                <MemberManager thesisId={thesis.id} members={thesis.members.map((m) => ({
                  id: m.user.id,
                  name: `${m.user.firstName} ${m.user.lastName}`,
                  isLeader: m.groupRole === 'LEADER',
                }))} />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Defense panel" />
            {thesis.panel.length === 0 ? (
              <EmptyState title="No panel assigned yet" description="The research coordinator assigns panel members before the defense." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {thesis.panel.map((assignment) => (
                  <li key={assignment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {assignment.panelist.firstName} {assignment.panelist.lastName}
                    </p>
                    {assignment.panelRole === 'CHAIR' && <Badge tone="info">Chair</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Defense schedules" />
            {thesis.defenses.length === 0 ? (
              <EmptyState title="No defense scheduled" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {thesis.defenses.map((defense) => (
                  <li key={defense.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone="info">{defense.defenseType === 'PROPOSAL' ? 'Proposal' : 'Final'}</Badge>
                      <StatusPill status={defense.status} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(defense.scheduledAt)}</p>
                    <p className="text-sm text-slate-600">{defense.venue}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {defense.panelists.map((p) => `${p.panelist.firstName} ${p.panelist.lastName}`).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
