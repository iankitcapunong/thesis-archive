/**
 * POST   /api/theses/[id]/members — add a group member
 * DELETE /api/theses/[id]/members?userId= — remove a group member
 * Supports FR-20 (member information) and Appendix 6.1 "Manage Thesis Members".
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requireUser } from '@/lib/api';
import { resolveThesisAccess } from '@/lib/access';
import { notify } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { THESIS_STATUS, NOTIFICATION_CATEGORY } from '@/lib/constants';

const MAX_GROUP_SIZE = 5;

const addSchema = z.object({ email: z.string().email('Enter a valid student email address.') });

export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id: thesisId } = await context.params;

  const access = await resolveThesisAccess(user, thesisId);
  if (!access.canManageMembers) {
    return fail('You do not have permission to manage this thesis group.', 403);
  }

  const { email } = await parseBody(request, addSchema);
  const normalized = email.toLowerCase().trim();

  const thesis = await prisma.thesisProject.findUnique({
    where: { id: thesisId },
    select: { id: true, referenceNo: true, title: true, status: true, _count: { select: { members: true } } },
  });
  if (!thesis) return fail('That thesis record no longer exists.', 404);
  if (thesis._count.members >= MAX_GROUP_SIZE) {
    return fail(`A thesis group may have at most ${MAX_GROUP_SIZE} members.`, 409);
  }

  const student = await prisma.user.findFirst({
    where: { email: normalized, role: 'STUDENT', status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!student) return fail('No active student account was found for that email address.', 404);

  const existingMembership = await prisma.thesisMember.findFirst({
    where: {
      userId: student.id,
      thesis: { status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
    },
    include: { thesis: { select: { referenceNo: true } } },
  });
  if (existingMembership) {
    return fail(
      existingMembership.thesisId === thesisId
        ? 'That student is already a member of this group.'
        : `That student already belongs to ${existingMembership.thesis.referenceNo}.`,
      409,
    );
  }

  await prisma.thesisMember.create({ data: { thesisId, userId: student.id, groupRole: 'MEMBER' } });

  await notify({
    userIds: [student.id],
    category: NOTIFICATION_CATEGORY.WORKFLOW,
    title: 'Added to a thesis project',
    body: `You were added to ${thesis.referenceNo} — ${thesis.title}.`,
    link: `/theses/${thesisId}`,
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.THESIS_MEMBER_ADDED,
    entityType: 'ThesisProject',
    entityId: thesisId,
    summary: `Added ${student.firstName} ${student.lastName} to ${thesis.referenceNo}.`,
    ipAddress: clientIp(request),
  });

  return ok({ message: `${student.firstName} ${student.lastName} was added to the group.` }, 201);
});

export const DELETE = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id: thesisId } = await context.params;
  const userId = new URL(request.url).searchParams.get('userId');

  const access = await resolveThesisAccess(user, thesisId);
  if (!access.canManageMembers) {
    return fail('You do not have permission to manage this thesis group.', 403);
  }
  if (!userId) return fail('Specify which member to remove.', 422);

  const membership = await prisma.thesisMember.findFirst({
    where: { thesisId, userId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!membership) return fail('That student is not a member of this group.', 404);

  if (membership.groupRole === 'LEADER') {
    return fail('The group leader cannot be removed. Transfer leadership first.', 409);
  }

  await prisma.thesisMember.delete({ where: { id: membership.id } });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.THESIS_MEMBER_REMOVED,
    entityType: 'ThesisProject',
    entityId: thesisId,
    summary: `Removed ${membership.user.firstName} ${membership.user.lastName} from the thesis group.`,
    ipAddress: clientIp(request),
  });

  return ok({ message: `${membership.user.firstName} ${membership.user.lastName} was removed from the group.` });
});
