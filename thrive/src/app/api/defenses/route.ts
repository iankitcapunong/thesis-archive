/**
 * GET  /api/defenses — FR-48 (schedules visible to the people involved)
 * POST /api/defenses — FR-46, FR-47, FR-49
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requireUser, requirePermission } from '@/lib/api';
import { notify, thesisAudience } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { DEFENSE_TYPE, DEFENSE_STATUS, ROLES, NOTIFICATION_CATEGORY } from '@/lib/constants';

export const GET = handler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const upcomingOnly = url.searchParams.get('upcoming') === 'true';

  const where: Record<string, unknown> = {};
  if (upcomingOnly) {
    where.scheduledAt = { gte: new Date() };
    where.status = DEFENSE_STATUS.SCHEDULED;
  }

  // Coordinators and administrators see the whole calendar; everyone else sees
  // only the defenses they take part in (FR-48).
  const scoped: Record<string, unknown>[] = [];
  if (user.role === ROLES.STUDENT) {
    scoped.push({ thesis: { members: { some: { userId: user.id } } } });
  } else if (user.role === ROLES.FACULTY_ADVISER) {
    scoped.push({ thesis: { adviserId: user.id } }, { panelists: { some: { panelistId: user.id } } });
  } else if (user.role === ROLES.PANEL_MEMBER) {
    scoped.push({ panelists: { some: { panelistId: user.id } } });
  } else if (user.role === ROLES.DEPARTMENT_CHAIR && user.department) {
    scoped.push({ thesis: { department: user.department } });
  } else if (user.role === ROLES.COLLEGE_ADMIN) {
    scoped.push({ thesis: { college: user.college } });
  }
  if (scoped.length) where.OR = scoped;

  const defenses = await prisma.defenseSchedule.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    include: {
      thesis: {
        select: {
          id: true,
          referenceNo: true,
          title: true,
          program: true,
          adviser: { select: { firstName: true, lastName: true } },
          members: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
      panelists: { include: { panelist: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  return ok({ defenses });
});

const createSchema = z.object({
  thesisId: z.string().min(1),
  defenseType: z.enum([DEFENSE_TYPE.PROPOSAL, DEFENSE_TYPE.FINAL]),
  scheduledAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  durationMin: z.number().int().min(30).max(300).optional(),
  venue: z.string().min(2, 'Specify the venue.').max(160),
  panelistIds: z.array(z.string()).min(1, 'Assign at least one panel member.').max(5),
  chairId: z.string().optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});

export const POST = handler(async (request) => {
  const user = await requirePermission('defense.manage');
  const input = await parseBody(request, createSchema);

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return fail('Enter a valid defense date and time.', 422);
  if (scheduledAt.getTime() < Date.now()) return fail('Defense schedules must be set in the future.', 422);

  const thesis = await prisma.thesisProject.findUnique({
    where: { id: input.thesisId },
    select: { id: true, referenceNo: true, title: true, status: true, adviserId: true },
  });
  if (!thesis) return fail('That thesis record no longer exists.', 404);
  if (!thesis.adviserId) return fail('Assign an adviser before scheduling a defense.', 409);

  const existing = await prisma.defenseSchedule.findFirst({
    where: { thesisId: input.thesisId, defenseType: input.defenseType, status: DEFENSE_STATUS.SCHEDULED },
    select: { id: true },
  });
  if (existing) {
    return fail(`A ${input.defenseType.toLowerCase()} defense is already scheduled for this group.`, 409);
  }

  const duration = input.durationMin ?? 90;
  const endsAt = new Date(scheduledAt.getTime() + duration * 60_000);

  // Refuse a panelist double-booking within the same window.
  const overlapping = await prisma.defenseSchedule.findMany({
    where: {
      status: DEFENSE_STATUS.SCHEDULED,
      panelists: { some: { panelistId: { in: input.panelistIds } } },
      scheduledAt: { lt: endsAt, gte: new Date(scheduledAt.getTime() - 4 * 60 * 60_000) },
    },
    include: { panelists: { include: { panelist: { select: { id: true, firstName: true, lastName: true } } } } },
  });

  for (const clash of overlapping) {
    const clashEnd = new Date(clash.scheduledAt.getTime() + clash.durationMin * 60_000);
    if (clash.scheduledAt < endsAt && clashEnd > scheduledAt) {
      const who = clash.panelists
        .filter((p) => input.panelistIds.includes(p.panelistId))
        .map((p) => `${p.panelist.firstName} ${p.panelist.lastName}`);
      if (who.length) {
        return fail(`${who.join(', ')} already has a defense scheduled in that time slot.`, 409);
      }
    }
  }

  const schedule = await prisma.defenseSchedule.create({
    data: {
      thesisId: input.thesisId,
      defenseType: input.defenseType,
      scheduledAt,
      durationMin: duration,
      venue: input.venue.trim(),
      remarks: input.remarks?.trim() || null,
      status: DEFENSE_STATUS.SCHEDULED,
      createdById: user.id,
      panelists: {
        create: input.panelistIds.map((pid) => ({
          panelistId: pid,
          panelRole: pid === input.chairId ? 'CHAIR' : 'MEMBER',
        })),
      },
    },
    select: { id: true, scheduledAt: true, venue: true, defenseType: true },
  });

  // Keep the thesis panel roster in step with the scheduled panel.
  await prisma.$transaction([
    prisma.panelAssignment.deleteMany({ where: { thesisId: input.thesisId } }),
    prisma.panelAssignment.createMany({
      data: input.panelistIds.map((pid) => ({
        thesisId: input.thesisId,
        panelistId: pid,
        panelRole: pid === input.chairId ? 'CHAIR' : 'MEMBER',
      })),
    }),
  ]);

  const audience = await thesisAudience(input.thesisId, { members: true, adviser: true, panel: true });
  await notify({
    userIds: audience,
    category: NOTIFICATION_CATEGORY.SCHEDULE,
    title: `${input.defenseType === 'PROPOSAL' ? 'Proposal' : 'Final'} defense scheduled`,
    body: `${thesis.referenceNo} is scheduled on ${scheduledAt.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' })} at ${input.venue}.`,
    link: `/theses/${input.thesisId}`,
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.DEFENSE_SCHEDULED,
    entityType: 'DefenseSchedule',
    entityId: schedule.id,
    summary: `Scheduled the ${input.defenseType.toLowerCase()} defense for ${thesis.referenceNo}.`,
    metadata: { thesisId: thesis.id, scheduledAt: scheduledAt.toISOString(), venue: input.venue },
    ipAddress: clientIp(request),
  });

  return ok({ schedule, message: `Defense scheduled and all participants have been notified.` }, 201);
});
