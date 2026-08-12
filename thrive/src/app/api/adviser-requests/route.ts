/**
 * GET  /api/adviser-requests — FR-26 (adviser's inbox), FR-27 (status)
 * POST /api/adviser-requests — FR-25 (student submits a request)
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requireUser, requirePermission } from '@/lib/api';
import { resolveThesisAccess } from '@/lib/access';
import { notify } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { REQUEST_STATUS, ROLES, NOTIFICATION_CATEGORY, THESIS_STATUS } from '@/lib/constants';

export const GET = handler(async (request) => {
  const user = await requireUser();
  const status = new URL(request.url).searchParams.get('status') ?? '';

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (user.role === ROLES.FACULTY_ADVISER) {
    where.adviserId = user.id;
  } else if (user.role === ROLES.STUDENT) {
    where.thesis = { members: { some: { userId: user.id } } };
  } else if (user.role !== ROLES.ADMIN && user.role !== ROLES.RESEARCH_COORDINATOR) {
    return fail('Your role does not have an adviser request queue.', 403);
  }

  const requests = await prisma.adviserRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      adviser: { select: { id: true, firstName: true, lastName: true } },
      thesis: {
        select: {
          id: true,
          referenceNo: true,
          title: true,
          program: true,
          abstract: true,
          members: { include: { user: { select: { firstName: true, lastName: true, schoolId: true } } } },
        },
      },
    },
  });

  return ok({ requests });
});

const createSchema = z.object({
  thesisId: z.string().min(1),
  adviserId: z.string().min(1),
  message: z.string().max(1000).optional().nullable(),
});

export const POST = handler(async (request) => {
  const user = await requirePermission('adviser.request');
  const input = await parseBody(request, createSchema);

  const access = await resolveThesisAccess(user, input.thesisId);
  if (access.relation !== 'MEMBER') {
    return fail('Only members of the thesis group may request an adviser.', 403);
  }

  const thesis = await prisma.thesisProject.findUnique({
    where: { id: input.thesisId },
    select: { id: true, referenceNo: true, title: true, adviserId: true, department: true },
  });
  if (!thesis) return fail('That thesis record no longer exists.', 404);

  // FR-28: an already-advised group cannot acquire a conflicting assignment.
  if (thesis.adviserId) {
    return fail('This thesis group already has an assigned adviser.', 409);
  }

  const adviser = await prisma.user.findFirst({
    where: { id: input.adviserId, role: ROLES.FACULTY_ADVISER, status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      advisingLoad: true,
      advisedTheses: {
        where: { status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
        select: { id: true },
      },
    },
  });
  if (!adviser) return fail('That faculty adviser is not available.', 404);

  if (adviser.advisedTheses.length >= adviser.advisingLoad) {
    return fail(
      `${adviser.firstName} ${adviser.lastName} has reached the maximum advising load of ${adviser.advisingLoad} groups.`,
      409,
    );
  }

  const duplicate = await prisma.adviserRequest.findFirst({
    where: { thesisId: input.thesisId, adviserId: input.adviserId, status: REQUEST_STATUS.PENDING },
    select: { id: true },
  });
  if (duplicate) return fail('A pending request to this adviser already exists.', 409);

  const created = await prisma.adviserRequest.create({
    data: {
      thesisId: input.thesisId,
      adviserId: input.adviserId,
      message: input.message?.trim() || null,
      status: REQUEST_STATUS.PENDING,
    },
    select: { id: true, status: true, createdAt: true },
  });

  await notify({
    userIds: [adviser.id],
    category: NOTIFICATION_CATEGORY.ADVISER,
    title: 'New adviser request',
    body: `${thesis.referenceNo} — "${thesis.title}" has requested you as thesis adviser.`,
    link: '/adviser/requests',
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.ADVISER_REQUESTED,
    entityType: 'AdviserRequest',
    entityId: created.id,
    summary: `${thesis.referenceNo} requested ${adviser.firstName} ${adviser.lastName} as adviser.`,
    metadata: { thesisId: thesis.id, adviserId: adviser.id },
    ipAddress: clientIp(request),
  });

  return ok(
    { request: created, message: `Request sent to ${adviser.firstName} ${adviser.lastName}.` },
    201,
  );
});
