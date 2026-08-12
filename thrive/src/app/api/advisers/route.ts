/**
 * GET /api/advisers — FR-24.
 * Availability is derived from the adviser's declared capacity minus the
 * thesis groups they are actively supervising.
 */

import { prisma } from '@/lib/prisma';
import { handler, ok, requireUser } from '@/lib/api';
import { ROLES, USER_STATUS, THESIS_STATUS } from '@/lib/constants';

export const GET = handler(async (request) => {
  await requireUser();
  const url = new URL(request.url);
  const department = url.searchParams.get('department')?.trim();

  const advisers = await prisma.user.findMany({
    where: {
      role: ROLES.FACULTY_ADVISER,
      status: USER_STATUS.ACTIVE,
      ...(department ? { department } : {}),
    },
    orderBy: [{ lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
      advisingLoad: true,
      advisedTheses: {
        where: { status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
        select: { id: true },
      },
      adviserRequests: {
        where: { status: 'PENDING' },
        select: { id: true },
      },
    },
  });

  return ok({
    advisers: advisers.map((a) => {
      const active = a.advisedTheses.length;
      return {
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        department: a.department,
        capacity: a.advisingLoad,
        activeGroups: active,
        pendingRequests: a.adviserRequests.length,
        slotsRemaining: Math.max(0, a.advisingLoad - active),
        available: active < a.advisingLoad,
      };
    }),
  });
});
