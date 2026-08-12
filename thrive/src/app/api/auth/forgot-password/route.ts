/** POST /api/auth/forgot-password — FR-08, FR-09. */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateResetToken, RESET_TOKEN_TTL_MINUTES } from '@/lib/auth';
import { handler, ok, parseBody } from '@/lib/api';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { USER_STATUS } from '@/lib/constants';

const schema = z.object({ email: z.string().email('Enter a valid email address.') });

/** FR-09: identical response whether or not the address matches an account. */
const GENERIC_MESSAGE =
  'If an active account matches that address, a recovery link valid for 30 minutes has been issued.';

export const POST = handler(async (request) => {
  const { email } = await parseBody(request, schema);
  const normalized = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user || user.status !== USER_STATUS.ACTIVE) {
    return ok({ message: GENERIC_MESSAGE });
  }

  // Invalidate any outstanding tokens so only the newest link works.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { token, tokenHash } = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
    entityType: 'User',
    entityId: user.id,
    summary: `Password recovery link issued for ${normalized}.`,
    ipAddress: clientIp(request),
  });

  const origin = new URL(request.url).origin;
  const resetLink = `${origin}/reset-password?token=${token}`;

  // No mail transport is configured in this build. In development the link is
  // returned so the flow is testable end to end; in production it is only
  // logged server-side and would instead be delivered by the institutional
  // mail service.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[recovery] reset link for ${normalized}: ${resetLink}`);
    return ok({ message: GENERIC_MESSAGE, devResetLink: resetLink });
  }

  console.log(`[recovery] reset link issued for ${normalized}`);
  return ok({ message: GENERIC_MESSAGE });
});
