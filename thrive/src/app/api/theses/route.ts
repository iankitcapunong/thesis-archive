/**
 * GET  /api/theses — FR-22 (role-scoped listing)
 * POST /api/theses — FR-19, FR-20, FR-41 (registration seeds the milestone plan)
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handler, ok, fail, parseBody, requireUser, requirePermission } from '@/lib/api';
import { thesisScopeFilter } from '@/lib/access';
import { STAGES } from '@/lib/workflow';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { THESIS_STATUS } from '@/lib/constants';

export const GET = handler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);

  const query = url.searchParams.get('query')?.trim() ?? '';
  const stage = url.searchParams.get('stage') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const take = Math.min(Number(url.searchParams.get('take') ?? 50), 200);

  const where: Record<string, unknown> = { ...thesisScopeFilter(user) };
  if (stage) where.currentStage = stage;
  if (status) where.status = status;
  if (query) {
    where.OR = [
      { title: { contains: query } },
      { referenceNo: { contains: query } },
      { keywords: { contains: query } },
    ];
  }

  const theses = await prisma.thesisProject.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take,
    include: {
      adviser: { select: { id: true, firstName: true, lastName: true } },
      members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      _count: { select: { documents: true } },
    },
  });

  return ok({ theses, total: theses.length });
});

const registerSchema = z.object({
  title: z.string().min(12, 'Provide a working thesis title of at least 12 characters.').max(300),
  abstract: z.string().max(4000).optional().nullable(),
  keywords: z.string().max(300).optional().nullable(),
  program: z.string().min(2, 'Select your degree program.').max(120),
  department: z.string().min(2, 'Select your department.').max(160),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Use the format 2026-2027.'),
  memberEmails: z.array(z.string().email()).max(5).optional(),
});

async function nextReferenceNo(academicYear: string): Promise<string> {
  const year = academicYear.split('-')[1] ?? new Date().getFullYear().toString();
  const prefix = `THRIVE-${year}-`;
  const latest = await prisma.thesisProject.findFirst({
    where: { referenceNo: { startsWith: prefix } },
    orderBy: { referenceNo: 'desc' },
    select: { referenceNo: true },
  });
  const sequence = latest ? Number(latest.referenceNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

export const POST = handler(async (request) => {
  const user = await requirePermission('thesis.register');
  const input = await parseBody(request, registerSchema);

  // A student may lead only one active thesis project at a time.
  const existing = await prisma.thesisMember.findFirst({
    where: {
      userId: user.id,
      thesis: { status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
    },
    include: { thesis: { select: { referenceNo: true } } },
  });
  if (existing) {
    return fail(
      `You are already part of an active thesis project (${existing.thesis.referenceNo}). Withdraw from it before registering another.`,
      409,
    );
  }

  // Resolve co-members; only active students may be added.
  const emails = [...new Set((input.memberEmails ?? []).map((e) => e.toLowerCase().trim()))].filter(
    (e) => e !== user.email.toLowerCase(),
  );
  const coMembers = emails.length
    ? await prisma.user.findMany({
        where: { email: { in: emails }, role: 'STUDENT', status: 'ACTIVE' },
        select: { id: true, email: true },
      })
    : [];

  const unresolved = emails.filter((e) => !coMembers.some((m) => m.email === e));
  if (unresolved.length) {
    return fail(`No active student account was found for: ${unresolved.join(', ')}.`, 422);
  }

  const alreadyEngaged = await prisma.thesisMember.findFirst({
    where: {
      userId: { in: coMembers.map((m) => m.id) },
      thesis: { status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
    },
    include: { user: { select: { email: true } } },
  });
  if (alreadyEngaged) {
    return fail(`${alreadyEngaged.user.email} already belongs to another active thesis project.`, 409);
  }

  const referenceNo = await nextReferenceNo(input.academicYear);

  const thesis = await prisma.thesisProject.create({
    data: {
      referenceNo,
      title: input.title.trim(),
      abstract: input.abstract?.trim() || null,
      keywords: input.keywords?.trim() || null,
      program: input.program,
      department: input.department,
      college: user.college,
      academicYear: input.academicYear,
      status: THESIS_STATUS.DRAFT,
      currentStage: 'PROPOSAL_DEVELOPMENT',
      createdById: user.id,
      members: {
        create: [
          { userId: user.id, groupRole: 'LEADER' },
          ...coMembers.map((m) => ({ userId: m.id, groupRole: 'MEMBER' })),
        ],
      },
      // FR-41: the full milestone plan is created up front; only the first
      // stage is open, the rest stay locked until prerequisites are met.
      milestones: {
        create: STAGES.map((stage) => ({
          stageKey: stage.key,
          name: stage.name,
          sequence: stage.sequence,
          status: stage.sequence === 1 ? 'IN_PROGRESS' : 'LOCKED',
          startedAt: stage.sequence === 1 ? new Date() : null,
        })),
      },
    },
    select: { id: true, referenceNo: true, title: true },
  });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.THESIS_REGISTERED,
    entityType: 'ThesisProject',
    entityId: thesis.id,
    summary: `Registered thesis project ${thesis.referenceNo}.`,
    metadata: { title: thesis.title, members: coMembers.length + 1 },
    ipAddress: clientIp(request),
  });

  if (coMembers.length) {
    await prisma.notification.createMany({
      data: coMembers.map((m) => ({
        userId: m.id,
        category: 'WORKFLOW',
        title: 'Added to a thesis project',
        body: `You were added to ${thesis.referenceNo} — ${thesis.title}.`,
        link: `/theses/${thesis.id}`,
      })),
    });
  }

  return ok(
    { thesis, message: `Thesis ${thesis.referenceNo} registered. Next step: request a faculty adviser.` },
    201,
  );
});
