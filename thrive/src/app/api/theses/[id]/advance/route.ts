/**
 * POST /api/theses/[id]/advance
 *
 * FR-40: progression is refused while a required document is unapproved.
 * FR-44: approving the milestone advances the project automatically.
 * FR-45: the next stage stays locked until its prerequisites are satisfied.
 */

import { prisma } from '@/lib/prisma';
import { handler, ok, fail, requirePermission } from '@/lib/api';
import { resolveThesisAccess } from '@/lib/access';
import { evaluateMilestoneGate, getStage, nextStage } from '@/lib/workflow';
import { notify, thesisAudience } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { NOTIFICATION_CATEGORY, THESIS_STATUS } from '@/lib/constants';

export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission('workflow.advance');
  const { id: thesisId } = await context.params;

  const access = await resolveThesisAccess(user, thesisId);
  if (!access.canManageWorkflow) {
    return fail('Only the assigned adviser or the research coordinator may advance this thesis.', 403);
  }

  const thesis = await prisma.thesisProject.findUnique({
    where: { id: thesisId },
    select: {
      id: true,
      referenceNo: true,
      title: true,
      currentStage: true,
      status: true,
      documents: {
        where: { isCurrent: true },
        select: { requirementKey: true, status: true, milestone: { select: { stageKey: true } } },
      },
      defenses: { select: { defenseType: true, status: true } },
    },
  });
  if (!thesis) return fail('That thesis record no longer exists.', 404);

  if (thesis.status === THESIS_STATUS.ARCHIVED || thesis.status === THESIS_STATUS.COMPLETED) {
    return fail('This thesis has already been completed.', 409);
  }

  const stage = getStage(thesis.currentStage);
  if (!stage) return fail('The current workflow stage is not recognised.', 409);

  const stageDocuments = thesis.documents.filter((d) => d.milestone.stageKey === thesis.currentStage);
  const defense = stage.defenseType
    ? (thesis.defenses.find((d) => d.defenseType === stage.defenseType) ?? null)
    : null;

  const gate = evaluateMilestoneGate(thesis.currentStage, stageDocuments, defense);

  if (!gate.canApprove) {
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.MILESTONE_BLOCKED,
      entityType: 'ThesisProject',
      entityId: thesisId,
      summary: `Advance refused for ${thesis.referenceNo} at ${stage.name}: ${gate.missing.length} requirement(s) outstanding.`,
      metadata: { stage: stage.key, missing: gate.missing },
      ipAddress: clientIp(request),
    });

    return fail('This milestone cannot be approved yet.', 409, { missing: gate.missing });
  }

  const upcoming = nextStage(thesis.currentStage);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.milestone.update({
      where: { thesisId_stageKey: { thesisId, stageKey: stage.key } },
      data: { status: 'APPROVED', approvedAt: now },
    });

    if (upcoming) {
      await tx.milestone.update({
        where: { thesisId_stageKey: { thesisId, stageKey: upcoming.key } },
        data: { status: 'IN_PROGRESS', startedAt: now },
      });
      await tx.thesisProject.update({
        where: { id: thesisId },
        data: { currentStage: upcoming.key, status: THESIS_STATUS.ACTIVE },
      });
    } else {
      await tx.thesisProject.update({
        where: { id: thesisId },
        data: { status: THESIS_STATUS.COMPLETED, completedAt: now },
      });
    }
  });

  const audience = await thesisAudience(thesisId, { members: true, adviser: true, panel: true });
  await notify({
    userIds: audience.filter((uid) => uid !== user.id),
    category: NOTIFICATION_CATEGORY.WORKFLOW,
    title: upcoming ? `Milestone approved: ${stage.name}` : 'Thesis completed',
    body: upcoming
      ? `${thesis.referenceNo} has moved to ${upcoming.name}.`
      : `${thesis.referenceNo} has completed all thesis milestones.`,
    link: `/theses/${thesisId}`,
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.MILESTONE_APPROVED,
    entityType: 'ThesisProject',
    entityId: thesisId,
    summary: upcoming
      ? `Approved ${stage.name} for ${thesis.referenceNo}; advanced to ${upcoming.name}.`
      : `Approved the final milestone for ${thesis.referenceNo}. Project marked completed.`,
    metadata: { from: stage.key, to: upcoming?.key ?? 'COMPLETED' },
    ipAddress: clientIp(request),
  });

  return ok({
    currentStage: upcoming?.key ?? stage.key,
    completed: !upcoming,
    message: upcoming
      ? `${stage.name} approved. The project now sits at ${upcoming.name}.`
      : 'Final milestone approved. The thesis is now marked completed and may be archived.',
  });
});
