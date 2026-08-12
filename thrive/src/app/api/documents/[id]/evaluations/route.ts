/**
 * POST /api/documents/[id]/evaluations
 * FR-35 to FR-39: advisers and panel members record remarks and a decision;
 * the decision drives the document status the students see.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requirePermission } from '@/lib/api';
import { resolveThesisAccess } from '@/lib/access';
import { notify, thesisAudience } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { DECISION, DOCUMENT_STATUS, NOTIFICATION_CATEGORY } from '@/lib/constants';

const schema = z.object({
  decision: z.enum([DECISION.APPROVED, DECISION.REVISE, DECISION.REJECTED]),
  comments: z
    .string()
    .min(10, 'Provide remarks of at least 10 characters so the students know what to act on.')
    .max(5000),
  score: z.number().min(0).max(100).optional().nullable(),
});

const STATUS_FOR_DECISION: Record<string, string> = {
  [DECISION.APPROVED]: DOCUMENT_STATUS.APPROVED,
  [DECISION.REVISE]: DOCUMENT_STATUS.REVISE,
  [DECISION.REJECTED]: DOCUMENT_STATUS.REJECTED,
};

export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission('evaluation.create');
  const { id } = await context.params;
  const input = await parseBody(request, schema);

  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      thesisId: true,
      title: true,
      version: true,
      status: true,
      isCurrent: true,
      thesis: { select: { referenceNo: true } },
    },
  });
  if (!document) return fail('That document no longer exists.', 404);

  const access = await resolveThesisAccess(user, document.thesisId);
  if (!access.canEvaluate) {
    return fail('Only the assigned adviser or panel members may evaluate this submission.', 403);
  }
  if (!document.isCurrent) {
    return fail('This is a superseded version. Evaluate the current submission instead.', 409);
  }

  const [evaluation] = await prisma.$transaction([
    prisma.evaluation.create({
      data: {
        documentId: id,
        evaluatorId: user.id,
        decision: input.decision,
        comments: input.comments.trim(),
        score: input.score ?? null,
      },
      select: { id: true, decision: true, createdAt: true },
    }),
    prisma.document.update({
      where: { id },
      data: { status: STATUS_FOR_DECISION[input.decision] },
    }),
  ]);

  // FR-38, FR-51: students are told immediately, with the decision in the body.
  const students = await thesisAudience(document.thesisId, { members: true, adviser: false });
  const verb =
    input.decision === DECISION.APPROVED
      ? 'approved'
      : input.decision === DECISION.REVISE
        ? 'returned for revision'
        : 'rejected';

  await notify({
    userIds: students,
    category: NOTIFICATION_CATEGORY.EVALUATION,
    title: `Document ${verb}`,
    body: `${document.title} (v${document.version}) was ${verb} by ${user.firstName} ${user.lastName}.`,
    link: `/theses/${document.thesisId}`,
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.DOCUMENT_EVALUATED,
    entityType: 'Document',
    entityId: id,
    summary: `${input.decision} — ${document.title} (v${document.version}) of ${document.thesis.referenceNo}.`,
    metadata: { decision: input.decision, thesisId: document.thesisId, score: input.score ?? undefined },
    ipAddress: clientIp(request),
  });

  return ok({
    evaluation,
    message:
      input.decision === DECISION.APPROVED
        ? 'Approval recorded. The students have been notified.'
        : 'Your remarks were recorded and the students have been notified.',
  });
});
