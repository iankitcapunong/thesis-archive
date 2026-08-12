/** POST /api/auth/reset-password — FR-08 (time-bound, single-use tokens). */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashResetToken, hashPassword } from '@/lib/auth';
import { handler, ok, fail, parseBody } from '@/lib/api';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { USER_STATUS } from '@/lib/constants';

const schema = z.object({
  token: z.string().min(16, 'This recovery link is not valid.'),
  password: z.string().min(10, 'Password must be at least 10 characters long.'),
});

const INVALID = 'This recovery link is invalid or has expired. Please request a new one.';

export const POST = handler(async (request) => {
  const { token, password } = await parseBody(request, schema);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { id: true, email: true, status: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail(INVALID, 400);
  }
  if (record.user.status !== USER_STATUS.ACTIVE) {
    return fail(INVALID, 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await recordAudit({
    actorId: record.userId,
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE,
    entityType: 'User',
    entityId: record.userId,
    summary: `Password was reset for ${record.user.email}.`,
    ipAddress: clientIp(request),
  });

  return ok({ message: 'Your password has been updated.' });
});
