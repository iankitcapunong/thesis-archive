/** PATCH /api/users/[id] — FR-16, FR-17, FR-18 (role and status changes). */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requireUser } from '@/lib/api';
import { can } from '@/lib/rbac';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { ALL_ROLES, USER_STATUS } from '@/lib/constants';

const patchSchema = z
  .object({
    role: z.enum(ALL_ROLES as [string, ...string[]]).optional(),
    status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.PENDING]).optional(),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    program: z.string().max(120).nullable().optional(),
    department: z.string().max(160).nullable().optional(),
    contactNo: z.string().max(40).nullable().optional(),
    advisingLoad: z.number().int().min(0).max(30).optional(),
    /** FR-18: destructive changes must be explicitly confirmed by the caller. */
    confirmed: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).some((k) => k !== 'confirmed'), {
    message: 'No changes were supplied.',
  });

export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await context.params;
  const input = await parseBody(request, patchSchema);

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return fail('That user account no longer exists.', 404);

  const changingRole = input.role !== undefined && input.role !== target.role;
  const changingStatus = input.status !== undefined && input.status !== target.status;

  if (changingRole && !can(actor.role, 'users.assignRole')) {
    return fail('Only an administrator may change user roles.', 403);
  }
  if (changingStatus && !can(actor.role, 'users.setStatus')) {
    return fail('Only an administrator may activate or deactivate accounts.', 403);
  }
  if (!changingRole && !changingStatus && !can(actor.role, 'users.update')) {
    return fail('Your role does not permit editing user records.', 403);
  }

  // FR-18: critical actions require explicit confirmation.
  if ((changingRole || changingStatus) && input.confirmed !== true) {
    return fail('This change must be explicitly confirmed before it can be applied.', 428);
  }

  // Guard against an administrator locking themselves out.
  if (actor.id === target.id) {
    if (changingStatus && input.status !== USER_STATUS.ACTIVE) {
      return fail('You cannot deactivate the account you are currently signed in with.', 409);
    }
    if (changingRole) {
      return fail('You cannot change your own role. Ask another administrator to do this.', 409);
    }
  }

  // Never leave the platform without an active administrator.
  if (target.role === 'ADMIN' && (changingRole || input.status === USER_STATUS.INACTIVE)) {
    const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: USER_STATUS.ACTIVE } });
    if (activeAdmins <= 1) {
      return fail('At least one active administrator account must remain.', 409);
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role: input.role,
      status: input.status,
      firstName: input.firstName,
      lastName: input.lastName,
      program: input.program,
      department: input.department,
      contactNo: input.contactNo,
      advisingLoad: input.advisingLoad,
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true },
  });

  const ip = clientIp(request);
  if (changingRole) {
    await recordAudit({
      actorId: actor.id,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      entityType: 'User',
      entityId: id,
      summary: `Changed role of ${target.email} from ${target.role} to ${updated.role}.`,
      metadata: { from: target.role, to: updated.role },
      ipAddress: ip,
    });
  }
  if (changingStatus) {
    await recordAudit({
      actorId: actor.id,
      action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
      entityType: 'User',
      entityId: id,
      summary: `Set account ${target.email} to ${updated.status}.`,
      metadata: { from: target.status, to: updated.status },
      ipAddress: ip,
    });
    await prisma.notification.create({
      data: {
        userId: id,
        category: 'ACCOUNT',
        title: 'Account status updated',
        body: `Your account status was changed to ${updated.status.toLowerCase()}.`,
      },
    });
  }
  if (!changingRole && !changingStatus) {
    await recordAudit({
      actorId: actor.id,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'User',
      entityId: id,
      summary: `Updated profile details for ${target.email}.`,
      ipAddress: ip,
    });
  }

  return ok({ user: updated, message: 'The account has been updated.' });
});
