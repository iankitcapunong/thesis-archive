/**
 * POST   /api/theses/[id]/panel — assign panel members
 * DELETE /api/theses/[id]/panel — remove a panel member
 * Supports FR-47 (assigned panel members) and SRS 4.5.2.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requirePermission } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { ROLES, NOTIFICATION_CATEGORY } from '@/lib/constants';

const assignSchema = z.object({
  panelistIds: z.array(z.string().min(1)).min(1, 'Select at least one panel member.').max(5),
  chairId: z.string().optional().nullable(),
});

export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission('panel.assign');
  const { id: thesisId } = await context.params;
  const input = await parseBody(request, assignSchema);

  const thesis = await prisma.thesisProject.findUnique({
    where: { id: thesisId },
    select: { id: true, referenceNo: true, title: true, adviserId: true },
  });
  if (!thesis) return fail('That thesis record no longer exists.', 404);

  // The adviser cannot sit on the panel evaluating their own advisees.
  if (thesis.adviserId && input.panelistIds.includes(thesis.adviserId)) {
    return fail('The assigned adviser cannot also serve as a panel member for the same group.', 409);
  }

  const panelists = await prisma.user.findMany({
    where: {
      id: { in: input.panelistIds },
      status: 'ACTIVE',
      role: { in: [ROLES.PANEL_MEMBER, ROLES.FACULTY_ADVISER] },
    },
    select: { id: true, firstName: true, lastName: true },
  });

  if (panelists.length !== input.panelistIds.length) {
    return fail('One or more selected faculty members are not eligible to serve on a panel.', 422);
  }

  await prisma.$transaction([
    prisma.panelAssignment.deleteMany({ where: { thesisId } }),
    prisma.panelAssignment.createMany({
      data: panelists.map((p) => ({
        thesisId,
        panelistId: p.id,
        panelRole: p.id === input.chairId ? 'CHAIR' : 'MEMBER',
      })),
    }),
  ]);

  await notify({
    userIds: panelists.map((p) => p.id),
    category: NOTIFICATION_CATEGORY.WORKFLOW,
    title: 'Panel assignment',
    body: `You have been assigned to the defense panel for ${thesis.referenceNo} — "${thesis.title}".`,
    link: `/theses/${thesisId}`,
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.PANEL_ASSIGNED,
    entityType: 'ThesisProject',
    entityId: thesisId,
    summary: `Assigned ${panelists.length} panel member(s) to ${thesis.referenceNo}.`,
    metadata: { panelists: panelists.map((p) => p.id) },
    ipAddress: clientIp(request),
  });

  return ok({ message: `Panel updated for ${thesis.referenceNo}.`, count: panelists.length });
});

export const DELETE = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission('panel.assign');
  const { id: thesisId } = await context.params;
  const panelistId = new URL(request.url).searchParams.get('panelistId');

  if (!panelistId) return fail('Specify which panel member to remove.', 422);

  const removed = await prisma.panelAssignment.deleteMany({ where: { thesisId, panelistId } });
  if (removed.count === 0) return fail('That panel member is not assigned to this thesis.', 404);

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.PANEL_ASSIGNED,
    entityType: 'ThesisProject',
    entityId: thesisId,
    summary: 'Removed a panel member from the thesis panel.',
    metadata: { panelistId },
    ipAddress: clientIp(request),
  });

  return ok({ message: 'Panel member removed.' });
});
