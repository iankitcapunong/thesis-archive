/**
 * POST /api/auth/register — student self-registration (FR-06).
 *
 * Only institutional addresses may register, and only as STUDENT. Every other
 * role stays administrator-provisioned through POST /api/users, so this route
 * can never be used to obtain adviser, coordinator or administrator access.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, startSession } from '@/lib/auth';
import { handler, ok, fail, parseBody } from '@/lib/api';
import { homeRouteFor } from '@/lib/rbac';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import {
  ROLES,
  USER_STATUS,
  ACADEMIC_PROGRAMS,
  INSTITUTIONAL_EMAIL_DOMAIN,
  isInstitutionalEmail,
} from '@/lib/constants';

const MIN_PASSWORD_LENGTH = 10;

const schema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').max(80),
    lastName: z.string().trim().min(1, 'Last name is required.').max(80),
    email: z
      .string()
      .trim()
      .email('Enter a valid email address.')
      .refine(isInstitutionalEmail, `Use your university address ending in @${INSTITUTIONAL_EMAIL_DOMAIN}.`),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(200)
      .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v), 'Include both uppercase and lowercase letters.')
      .refine((v) => /\d/.test(v), 'Include at least one number.'),
    confirmPassword: z.string(),
    schoolId: z.string().trim().max(40).optional(),
    program: z.string().trim().max(120).optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  });

export const POST = handler(async (request) => {
  const input = await parseBody(request, schema);
  const email = input.email.toLowerCase();
  const ip = clientIp(request);

  // Belt and braces: the schema already refuses non-institutional addresses,
  // but the domain rule is the whole security boundary of this route.
  if (!isInstitutionalEmail(email)) {
    return fail(`Registration is limited to @${INSTITUTIONAL_EMAIL_DOMAIN} addresses.`, 422);
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return fail(
      'An account already exists for that address. Try signing in, or use the password recovery link.',
      409,
    );
  }

  // An unrecognised program is dropped rather than rejected — the coordinator
  // corrects it during onboarding, and it is not worth blocking a signup over.
  const program = input.program && ACADEMIC_PROGRAMS.includes(input.program) ? input.program : null;

  const created = await prisma.user.create({
    data: {
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      passwordHash: await hashPassword(input.password),
      schoolId: input.schoolId || null,
      program,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true, college: true },
  });

  await recordAudit({
    actorId: created.id,
    action: AUDIT_ACTIONS.USER_REGISTERED,
    entityType: 'User',
    entityId: created.id,
    summary: `${created.firstName} ${created.lastName} registered a student account (${created.email}).`,
    metadata: { role: created.role, selfService: true },
    ipAddress: ip,
  });

  await startSession({
    id: created.id,
    email: created.email,
    role: created.role,
    firstName: created.firstName,
    lastName: created.lastName,
    department: created.department,
    college: created.college,
  });

  await prisma.user.update({ where: { id: created.id }, data: { lastLoginAt: new Date() } });

  return ok(
    {
      user: { id: created.id, firstName: created.firstName, lastName: created.lastName, role: created.role },
      redirectTo: homeRouteFor(created.role),
    },
    201,
  );
});
