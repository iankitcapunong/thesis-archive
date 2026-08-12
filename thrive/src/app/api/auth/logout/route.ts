/** POST /api/auth/logout — FR-05. */

import { getCurrentUser, endSession } from '@/lib/auth';
import { handler, ok } from '@/lib/api';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';

export const POST = handler(async (request) => {
  const user = await getCurrentUser();
  await endSession();

  if (user) {
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: 'User',
      entityId: user.id,
      summary: `${user.firstName} ${user.lastName} signed out.`,
      ipAddress: clientIp(request),
    });
  }

  return ok({ message: 'Your session has been ended.' });
});
