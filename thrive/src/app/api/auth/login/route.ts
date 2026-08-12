/** POST /api/auth/login — FR-01, FR-03, FR-04, NFR-10. */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, startSession } from '@/lib/auth';
import { handler, ok, fail, parseBody } from '@/lib/api';
import { homeRouteFor } from '@/lib/rbac';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { USER_STATUS } from '@/lib/constants';

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

/**
 * FR-01/FR-03: every rejection returns the same message and the same shape, so
 * the response never reveals whether the address exists or which field failed.
 */
const GENERIC_FAILURE = 'The credentials provided are not valid. Please check and try again.';

export const POST = handler(async (request) => {
  const { email, password } = await parseBody(request, schema);
  const ip = clientIp(request);
  const normalized = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    // Constant-ish work on the miss path to avoid a trivial timing oracle.
    await verifyPassword(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    await recordAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'User',
      summary: `Failed sign-in attempt for ${normalized} (no matching account).`,
      ipAddress: ip,
    });
    return fail(GENERIC_FAILURE, 401);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      summary: `Failed sign-in attempt for ${normalized} (incorrect password).`,
      ipAddress: ip,
    });
    return fail(GENERIC_FAILURE, 401);
  }

  // FR-04: a deactivated account is refused even with correct credentials.
  if (user.status !== USER_STATUS.ACTIVE) {
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      summary: `Sign-in refused for ${normalized} (account status: ${user.status}).`,
      ipAddress: ip,
    });
    return fail(
      'This account is not active. Please contact your research coordinator or the system administrator.',
      403,
    );
  }

  await startSession({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    department: user.department,
    college: user.college,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    entityType: 'User',
    entityId: user.id,
    summary: `${user.firstName} ${user.lastName} signed in.`,
    ipAddress: ip,
  });

  return ok({
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
    redirectTo: homeRouteFor(user.role),
  });
});
