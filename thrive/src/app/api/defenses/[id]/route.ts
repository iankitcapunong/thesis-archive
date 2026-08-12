/** PATCH /api/defenses/[id] — FR-46 (manage schedules), FR-49 (alerts). */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requirePermission } from '@/lib/api';
import { notify, thesisAudience } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { DEFENSE_STATUS, NOTIFICATION_CATEGORY } from '@/lib/constants';

const schema = z.object({
  scheduledAt: z.string().min(10).optional(),
  venue: z.string().min(2).max(160).optional(),
  durationMin: z.number().int().min(30).max(300).optional(),
  status: z
    .enum([DEFENSE_STATUS.SCHEDULED, DEFENSE_STATUS.COMPLETED, DEFENSE_STATUS.CANCELLED, DEFENSE_STATUS.RESCHEDULED])
    .optional(),
  remarks: z.string().max(1000).nullable().optional(),
});

export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission('defense.manage');
  const { id } = await context.params;
  const input = await parseBody(request, schema);

  const schedule = await prisma.defenseSchedule.findUnique({
    where: { id },
    include: { thesis: { select: { id: true, referenceNo: true } } },
  });
  if (!schedule) return fail('That defense schedule no longer exists.', 404);

  let scheduledAt: Date | undefined;
  if (input.scheduledAt) {
    scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return fail('Enter a valid defense date and time.', 422);
  }

  const updated = await prisma.defenseSchedule.update({
    where: { id },
    data: {
      scheduledAt,
      venue: input.venue?.trim(),
      durationMin: input.durationMin,
      status: input.status,
      remarks: input.remarks === undefined ? undefined : input.remarks?.trim() || null,
    },
    select: { id: true, scheduledAt: true, venue: true, status: true, defenseType: true },
  });

  const audience = await thesisAudience(schedule.thesisId, { members: true, adviser: true, panel: true });
  const label = updated.defenseType === 'PROPOSAL' ? 'Proposal' : 'Final';

  if (input.status === DEFENSE_STATUS.CANCELLED) {
    await notify({
      userIds: audience,
      category: NOTIFICATION_CATEGORY.SCHEDULE,
      title: `${label} defense cancelled`,
      body: `The ${label.toLowerCase()} defense for ${schedule.thesis.referenceNo} has been cancelled.`,
      link: `/theses/${schedule.thesisId}`,
    });
  } else if (input.status === DEFENSE_STATUS.COMPLETED) {
    await notify({
      userIds: audience,
      category: NOTIFICATION_CATEGORY.SCHEDULE,
      title: `${label} defense completed`,
      body: `The ${label.toLowerCase()} defense for ${schedule.thesis.referenceNo} has been recorded as completed.`,
      link: `/theses/${schedule.thesisId}`,
    });
  } else if (scheduledAt || input.venue) {
    await notify({
      userIds: audience,
      category: NOTIFICATION_CATEGORY.SCHEDULE,
      title: `${label} defense updated`,
      body: `${schedule.thesis.referenceNo} is now set for ${updated.scheduledAt.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' })} at ${updated.venue}.`,
      link: `/theses/${schedule.thesisId}`,
    });
  }

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.DEFENSE_UPDATED,
    entityType: 'DefenseSchedule',
    entityId: id,
    summary: `Updated the ${label.toLowerCase()} defense for ${schedule.thesis.referenceNo}.`,
    metadata: { changes: Object.keys(input) },
    ipAddress: clientIp(request),
  });

  return ok({ schedule: updated, message: 'Defense schedule updated and participants notified.' });
});
