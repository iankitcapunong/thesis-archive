/**
 * GET   /api/theses/[id]  — FR-22 (scoped read)
 * PATCH /api/theses/[id]  — FR-20 (permitted field updates)
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requireUser } from '@/lib/api';
import { resolveThesisAccess } from '@/lib/access';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';

export const GET = handler(async (_request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const access = await resolveThesisAccess(user, id);
  if (!access.canView) return fail('You do not have access to this thesis record.', 403);

  const thesis = await prisma.thesisProject.findUnique({
    where: { id },
    include: {
      adviser: { select: { id: true, firstName: true, lastName: true, email: true } },
      members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, schoolId: true } } } },
      panel: { include: { panelist: { select: { id: true, firstName: true, lastName: true } } } },
      milestones: { orderBy: { sequence: 'asc' } },
      documents: {
        orderBy: [{ createdAt: 'desc' }],
        include: {
          uploadedBy: { select: { firstName: true, lastName: true } },
          evaluations: {
            orderBy: { createdAt: 'desc' },
            include: { evaluator: { select: { firstName: true, lastName: true, role: true } } },
          },
        },
      },
      defenses: { orderBy: { scheduledAt: 'desc' }, include: { panelists: { include: { panelist: true } } } },
    },
  });

  if (!thesis) return fail('That thesis record no longer exists.', 404);
  return ok({ thesis, access });
});

const patchSchema = z.object({
  title: z.string().min(12, 'Title must be at least 12 characters.').max(300).optional(),
  abstract: z.string().max(4000).nullable().optional(),
  keywords: z.string().max(300).nullable().optional(),
  program: z.string().max(120).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'WITHDRAWN']).optional(),
});

export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const access = await resolveThesisAccess(user, id);
  if (!access.canEdit) return fail('You do not have permission to modify this thesis record.', 403);

  const input = await parseBody(request, patchSchema);

  // Students may edit descriptive fields but never the lifecycle status.
  if (input.status !== undefined && access.relation === 'MEMBER') {
    return fail('Only your adviser or the research coordinator may change the project status.', 403);
  }

  const updated = await prisma.thesisProject.update({
    where: { id },
    data: {
      title: input.title?.trim(),
      abstract: input.abstract === undefined ? undefined : input.abstract?.trim() || null,
      keywords: input.keywords === undefined ? undefined : input.keywords?.trim() || null,
      program: input.program,
      status: input.status,
    },
    select: { id: true, referenceNo: true, title: true, status: true },
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.THESIS_UPDATED,
    entityType: 'ThesisProject',
    entityId: id,
    summary: `Updated thesis ${updated.referenceNo}.`,
    metadata: { fields: Object.keys(input) },
    ipAddress: clientIp(request),
  });

  return ok({ thesis: updated, message: 'Thesis information saved.' });
});
