/**
 * POST /api/theses/[id]/archive — FR-61, FR-62, FR-63.
 * Only a completed project may be archived, and visibility is set explicitly
 * so access to archived records stays governed.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requirePermission } from '@/lib/api';
import { notify, thesisAudience } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { THESIS_STATUS, NOTIFICATION_CATEGORY } from '@/lib/constants';

const schema = z.object({
  visibility: z.enum(['PUBLIC', 'INSTITUTIONAL', 'RESTRICTED']).optional(),
  citation: z.string().max(600).optional().nullable(),
});

export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission('archive.create');
  const { id: thesisId } = await context.params;
  const parsed = await parseBody(request, schema);
  const input = { ...parsed, visibility: parsed.visibility ?? 'INSTITUTIONAL' };

  const thesis = await prisma.thesisProject.findUnique({
    where: { id: thesisId },
    include: {
      members: { include: { user: { select: { firstName: true, lastName: true } } } },
      archive: { select: { id: true } },
      documents: {
        where: { requirementKey: 'APPROVED_MANUSCRIPT', isCurrent: true },
        select: { id: true, status: true },
      },
    },
  });
  if (!thesis) return fail('That thesis record no longer exists.', 404);
  if (thesis.archive) return fail('This thesis has already been archived.', 409);

  if (thesis.status !== THESIS_STATUS.COMPLETED) {
    return fail('Only a thesis that has completed all milestones can be archived.', 409);
  }

  const manuscript = thesis.documents.find((d) => d.status === 'APPROVED');
  if (!manuscript) {
    return fail('The approved final manuscript must be on file before archiving.', 409);
  }

  const authors = thesis.members
    .map((m) => `${m.user.lastName}, ${m.user.firstName.charAt(0)}.`)
    .join(', ');
  const year = new Date().getFullYear();
  const citation =
    input.citation?.trim() ||
    `${authors} (${year}). ${thesis.title}. Undergraduate thesis, Caraga State University, ${thesis.department}.`;

  await prisma.$transaction([
    prisma.archivedThesis.create({
      data: {
        thesisId,
        manuscriptId: manuscript.id,
        citation,
        keywords: thesis.keywords,
        visibility: input.visibility,
        archivedById: user.id,
      },
    }),
    prisma.thesisProject.update({ where: { id: thesisId }, data: { status: THESIS_STATUS.ARCHIVED } }),
  ]);

  const audience = await thesisAudience(thesisId, { members: true, adviser: true });
  await notify({
    userIds: audience,
    category: NOTIFICATION_CATEGORY.WORKFLOW,
    title: 'Thesis archived',
    body: `${thesis.referenceNo} has been archived as an institutional record.`,
    link: '/archive',
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.THESIS_ARCHIVED,
    entityType: 'ThesisProject',
    entityId: thesisId,
    summary: `Archived ${thesis.referenceNo} with ${input.visibility.toLowerCase()} visibility.`,
    metadata: { visibility: input.visibility },
    ipAddress: clientIp(request),
  });

  return ok({ message: `${thesis.referenceNo} has been archived.`, citation });
});
