/**
 * PATCH /api/adviser-requests/[id] — FR-26, FR-27, FR-28.
 * Accepting a request assigns the adviser and, within the same transaction,
 * withdraws the group's other pending requests so no conflicting assignment
 * can be created.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requirePermission } from '@/lib/api';
import { notify, thesisAudience } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { REQUEST_STATUS, NOTIFICATION_CATEGORY, THESIS_STATUS } from '@/lib/constants';

const schema = z.object({
  decision: z.enum([REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.REJECTED]),
  response: z.string().max(1000).optional().nullable(),
});

export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission('adviser.respond');
  const { id } = await context.params;
  const input = await parseBody(request, schema);

  const adviserRequest = await prisma.adviserRequest.findUnique({
    where: { id },
    include: {
      thesis: { select: { id: true, referenceNo: true, title: true, adviserId: true, status: true } },
    },
  });
  if (!adviserRequest) return fail('That request no longer exists.', 404);

  if (adviserRequest.adviserId !== user.id) {
    return fail('This request was addressed to a different faculty member.', 403);
  }
  if (adviserRequest.status !== REQUEST_STATUS.PENDING) {
    return fail(`This request has already been ${adviserRequest.status.toLowerCase()}.`, 409);
  }

  const now = new Date();

  if (input.decision === REQUEST_STATUS.REJECTED) {
    await prisma.adviserRequest.update({
      where: { id },
      data: { status: REQUEST_STATUS.REJECTED, response: input.response?.trim() || null, respondedAt: now },
    });

    const students = await thesisAudience(adviserRequest.thesisId, { members: true, adviser: false });
    await notify({
      userIds: students,
      category: NOTIFICATION_CATEGORY.ADVISER,
      title: 'Adviser request declined',
      body: `${user.firstName} ${user.lastName} declined your adviser request for ${adviserRequest.thesis.referenceNo}.`,
      link: '/student/adviser',
    });

    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.ADVISER_RESPONDED,
      entityType: 'AdviserRequest',
      entityId: id,
      summary: `Declined the adviser request from ${adviserRequest.thesis.referenceNo}.`,
      ipAddress: clientIp(request),
    });

    return ok({ status: REQUEST_STATUS.REJECTED, message: 'The request has been declined and the group notified.' });
  }

  // FR-28: refuse acceptance if an adviser was assigned in the meantime.
  if (adviserRequest.thesis.adviserId) {
    await prisma.adviserRequest.update({
      where: { id },
      data: { status: REQUEST_STATUS.CANCELLED, respondedAt: now },
    });
    return fail('This group already has an assigned adviser, so the request was closed.', 409);
  }

  // Capacity is re-checked at acceptance time, not only at request time.
  const activeGroups = await prisma.thesisProject.count({
    where: { adviserId: user.id, status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
  });
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { advisingLoad: true } });
  if (profile && activeGroups >= profile.advisingLoad) {
    return fail(`You have reached your advising load of ${profile.advisingLoad} groups.`, 409);
  }

  await prisma.$transaction([
    prisma.adviserRequest.update({
      where: { id },
      data: { status: REQUEST_STATUS.ACCEPTED, response: input.response?.trim() || null, respondedAt: now },
    }),
    // Close the group's other outstanding requests.
    prisma.adviserRequest.updateMany({
      where: { thesisId: adviserRequest.thesisId, status: REQUEST_STATUS.PENDING, id: { not: id } },
      data: { status: REQUEST_STATUS.CANCELLED, respondedAt: now },
    }),
    prisma.thesisProject.update({
      where: { id: adviserRequest.thesisId },
      data: { adviserId: user.id, status: THESIS_STATUS.ACTIVE },
    }),
  ]);

  const students = await thesisAudience(adviserRequest.thesisId, { members: true, adviser: false });
  await notify({
    userIds: students,
    category: NOTIFICATION_CATEGORY.ADVISER,
    title: 'Adviser assigned',
    body: `${user.firstName} ${user.lastName} accepted your request and is now the adviser for ${adviserRequest.thesis.referenceNo}.`,
    link: `/theses/${adviserRequest.thesisId}`,
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.ADVISER_RESPONDED,
    entityType: 'AdviserRequest',
    entityId: id,
    summary: `Accepted the adviser request from ${adviserRequest.thesis.referenceNo}.`,
    metadata: { thesisId: adviserRequest.thesisId },
    ipAddress: clientIp(request),
  });

  return ok({
    status: REQUEST_STATUS.ACCEPTED,
    message: `You are now the adviser for ${adviserRequest.thesis.referenceNo}.`,
  });
});
