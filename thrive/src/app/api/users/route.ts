/**
 * GET  /api/users — FR-14, FR-15 (directory with search and filters)
 * POST /api/users — FR-06, FR-07 (administrator-created accounts with roles)
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { handler, ok, fail, parseBody, requirePermission } from '@/lib/api';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { ALL_ROLES, USER_STATUS, ROLES } from '@/lib/constants';

export const GET = handler(async (request) => {
  const user = await requirePermission('users.view');
  const url = new URL(request.url);

  const query = url.searchParams.get('query')?.trim() ?? '';
  const role = url.searchParams.get('role') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const take = Math.min(Number(url.searchParams.get('take') ?? 50), 200);
  const skip = Math.max(Number(url.searchParams.get('skip') ?? 0), 0);

  const where: Record<string, unknown> = {};

  // Chairs see their own department only (SRS 4.5.3 scoped visibility).
  if (user.role === ROLES.DEPARTMENT_CHAIR && user.department) {
    where.department = user.department;
  } else if (user.role === ROLES.COLLEGE_ADMIN) {
    where.college = user.college;
  }

  if (role && ALL_ROLES.includes(role as never)) where.role = role;
  if (status) where.status = status;
  if (query) {
    where.OR = [
      { firstName: { contains: query } },
      { lastName: { contains: query } },
      { email: { contains: query } },
      { schoolId: { contains: query } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take,
      skip,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        schoolId: true,
        program: true,
        department: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return ok({ users, total, take, skip });
});

const createSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(80),
  lastName: z.string().min(1, 'Last name is required.').max(80),
  email: z.string().email('Enter a valid institutional email address.'),
  role: z.enum(ALL_ROLES as [string, ...string[]], { errorMap: () => ({ message: 'Select a valid role.' }) }),
  password: z.string().min(10, 'Temporary password must be at least 10 characters.'),
  schoolId: z.string().max(40).optional().nullable(),
  program: z.string().max(120).optional().nullable(),
  department: z.string().max(160).optional().nullable(),
  contactNo: z.string().max(40).optional().nullable(),
});

export const POST = handler(async (request) => {
  const actor = await requirePermission('users.create');
  const input = await parseBody(request, createSchema);
  const email = input.email.toLowerCase().trim();

  // A coordinator may onboard students and faculty but never create
  // administrators or other coordinators (privilege-escalation guard).
  if (actor.role !== ROLES.ADMIN) {
    const allowed: string[] = [ROLES.STUDENT, ROLES.FACULTY_ADVISER, ROLES.PANEL_MEMBER];
    if (!allowed.includes(input.role)) {
      return fail('Your role may only create student, faculty adviser and panel member accounts.', 403);
    }
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return fail('An account with that email address already exists.', 409);

  const created = await prisma.user.create({
    data: {
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      passwordHash: await hashPassword(input.password),
      status: USER_STATUS.ACTIVE,
      schoolId: input.schoolId || null,
      program: input.program || null,
      department: input.department || actor.department,
      contactNo: input.contactNo || null,
      college: actor.college,
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true },
  });

  await recordAudit({
    actorId: actor.id,
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: 'User',
    entityId: created.id,
    summary: `Created ${created.role} account for ${created.email}.`,
    metadata: { role: created.role },
    ipAddress: clientIp(request),
  });

  return ok({ user: created, message: `Account created for ${created.firstName} ${created.lastName}.` }, 201);
});
