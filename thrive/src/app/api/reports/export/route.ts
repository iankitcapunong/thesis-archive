/**
 * GET /api/reports/export?type=...
 * FR-59, FR-60: authorized users generate reports from live data, exported as
 * CSV for spreadsheet-based institutional reporting.
 */

import { prisma } from '@/lib/prisma';
import { handler, fail, requirePermission } from '@/lib/api';
import { thesisScopeFilter } from '@/lib/access';
import { buildAnalytics } from '@/lib/analytics';
import { stageName } from '@/lib/workflow';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';

const REPORT_TYPES = ['thesis-progress', 'adviser-workload', 'defense-schedule', 'document-status'] as const;
type ReportType = (typeof REPORT_TYPES)[number];

function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? '' : String(cell);
          // Neutralise spreadsheet formula injection on export.
          const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
          return `"${guarded.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
}

export const GET = handler(async (request) => {
  const user = await requirePermission('reports.generate');
  const url = new URL(request.url);
  const type = (url.searchParams.get('type') ?? 'thesis-progress') as ReportType;

  if (!REPORT_TYPES.includes(type)) {
    return fail(`Unknown report type. Choose one of: ${REPORT_TYPES.join(', ')}.`, 422);
  }

  const scope = thesisScopeFilter(user);
  const generatedAt = new Date();
  let rows: (string | number | null)[][];

  if (type === 'thesis-progress') {
    const theses = await prisma.thesisProject.findMany({
      where: scope,
      orderBy: { referenceNo: 'asc' },
      include: {
        adviser: { select: { firstName: true, lastName: true } },
        members: { include: { user: { select: { firstName: true, lastName: true } } } },
        milestones: true,
        documents: { where: { isCurrent: true }, select: { status: true } },
      },
    });

    rows = [
      ['Reference No', 'Title', 'Program', 'Department', 'Academic Year', 'Status', 'Current Stage',
        'Adviser', 'Members', 'Milestones Approved', 'Documents Approved', 'Documents Pending', 'Last Updated'],
      ...theses.map((t) => [
        t.referenceNo,
        t.title,
        t.program,
        t.department,
        t.academicYear,
        t.status,
        stageName(t.currentStage),
        t.adviser ? `${t.adviser.firstName} ${t.adviser.lastName}` : 'Unassigned',
        t.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join('; '),
        t.milestones.filter((m) => m.status === 'APPROVED').length,
        t.documents.filter((d) => d.status === 'APPROVED').length,
        t.documents.filter((d) => d.status !== 'APPROVED').length,
        t.updatedAt.toISOString(),
      ]),
    ];
  } else if (type === 'adviser-workload') {
    const analytics = await buildAnalytics(user);
    rows = [
      ['Adviser', 'Department', 'Capacity', 'Active Groups', 'Utilisation %', 'Documents Awaiting Review'],
      ...analytics.adviserWorkload.map((a) => [
        a.name,
        a.department,
        a.capacity,
        a.activeGroups,
        a.utilisation,
        a.pendingReviews,
      ]),
    ];
  } else if (type === 'defense-schedule') {
    const defenses = await prisma.defenseSchedule.findMany({
      where: { thesis: scope },
      orderBy: { scheduledAt: 'asc' },
      include: {
        thesis: { select: { referenceNo: true, title: true, program: true } },
        panelists: { include: { panelist: { select: { firstName: true, lastName: true } } } },
      },
    });
    rows = [
      ['Reference No', 'Title', 'Program', 'Defense Type', 'Scheduled At', 'Duration (min)', 'Venue', 'Status', 'Panel'],
      ...defenses.map((d) => [
        d.thesis.referenceNo,
        d.thesis.title,
        d.thesis.program,
        d.defenseType,
        d.scheduledAt.toISOString(),
        d.durationMin,
        d.venue,
        d.status,
        d.panelists.map((p) => `${p.panelist.firstName} ${p.panelist.lastName}`).join('; '),
      ]),
    ];
  } else {
    const documents = await prisma.document.findMany({
      where: { isCurrent: true, thesis: scope },
      orderBy: { createdAt: 'desc' },
      include: {
        thesis: { select: { referenceNo: true } },
        milestone: { select: { name: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
        evaluations: { orderBy: { createdAt: 'desc' }, take: 1, include: { evaluator: { select: { firstName: true, lastName: true } } } },
      },
    });
    rows = [
      ['Reference No', 'Milestone', 'Document', 'Version', 'Status', 'Submitted By', 'Submitted At', 'Last Evaluator', 'Last Decision'],
      ...documents.map((d) => [
        d.thesis.referenceNo,
        d.milestone.name,
        d.title,
        d.version,
        d.status,
        `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`,
        d.createdAt.toISOString(),
        d.evaluations[0] ? `${d.evaluations[0].evaluator.firstName} ${d.evaluations[0].evaluator.lastName}` : '',
        d.evaluations[0]?.decision ?? '',
      ]),
    ];
  }

  const header = [
    [`CSU-THRIVE ${type.replace(/-/g, ' ')} report`],
    [`Generated ${generatedAt.toISOString()} by ${user.firstName} ${user.lastName} (${user.role})`],
    [],
  ];

  const csv = toCsv([...header, ...rows]);

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.REPORT_GENERATED,
    entityType: 'Report',
    summary: `Generated the ${type} report (${rows.length - 1} rows).`,
    metadata: { type, rows: rows.length - 1 },
    ipAddress: clientIp(request),
  });

  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="thrive-${type}-${generatedAt.toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
