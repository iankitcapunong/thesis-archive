/**
 * GET   /api/notifications — FR-50, FR-52 (own notifications only)
 * PATCH /api/notifications — mark one or all as read
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, parseBody, requireUser } from '@/lib/api';

export const GET = handler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const take = Math.min(Number(url.searchParams.get('take') ?? 50), 200);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return ok({ notifications, unreadCount });
});

const patchSchema = z.object({
  id: z.string().optional(),
  markAll: z.boolean().optional(),
});

export const PATCH = handler(async (request) => {
  const user = await requireUser();
  const { id, markAll } = await parseBody(request, patchSchema);

  if (markAll) {
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ updated: result.count, message: 'All notifications marked as read.' });
  }

  if (id) {
    // Scoped by userId so one user can never mark another's notification.
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ updated: result.count });
  }

  return ok({ updated: 0 });
});
