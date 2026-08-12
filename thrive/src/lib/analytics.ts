/**
 * Institutional analytics (FR-57, FR-58, FR-60).
 * Every figure is computed from live tables at call time, so a report always
 * reflects the most recent available data.
 */

import 'server-only';
import { prisma } from './prisma';
import { STAGES } from './workflow';
import { THESIS_STATUS, ROLES, DOCUMENT_STATUS } from './constants';
import type { SessionUser } from './auth';
import { thesisScopeFilter } from './access';

export type Analytics = {
  totals: {
    active: number;
    completed: number;
    archived: number;
    draft: number;
    all: number;
    completionRate: number;
  };
  stageDistribution: { key: string; name: string; count: number }[];
  adviserWorkload: {
    id: string;
    name: string;
    department: string | null;
    capacity: number;
    activeGroups: number;
    pendingReviews: number;
    utilisation: number;
  }[];
  panelWorkload: { id: string; name: string; assignments: number; upcomingDefenses: number }[];
  documentStatus: { status: string; count: number }[];
  compliance: {
    unadvisedGroups: number;
    overdueReviews: number;
    stalledGroups: number;
    upcomingDefenses: number;
  };
  programBreakdown: { program: string; total: number; completed: number }[];
  recentActivity: { id: string; summary: string; action: string; createdAt: Date; actor: string | null }[];
};

const STALE_REVIEW_DAYS = 7;
const STALLED_DAYS = 30;

export async function buildAnalytics(user: SessionUser): Promise<Analytics> {
  const scope = thesisScopeFilter(user);
  const staleCutoff = new Date(Date.now() - STALE_REVIEW_DAYS * 24 * 60 * 60 * 1000);
  const stalledCutoff = new Date(Date.now() - STALLED_DAYS * 24 * 60 * 60 * 1000);

  const [theses, advisers, panelists, documents, auditLogs, upcomingDefenses] = await Promise.all([
    prisma.thesisProject.findMany({
      where: scope,
      select: {
        id: true,
        status: true,
        currentStage: true,
        program: true,
        adviserId: true,
        updatedAt: true,
      },
    }),
    prisma.user.findMany({
      where: { role: ROLES.FACULTY_ADVISER, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        advisingLoad: true,
        advisedTheses: {
          where: { status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
          select: {
            id: true,
            documents: {
              where: { isCurrent: true, status: DOCUMENT_STATUS.UNDER_REVIEW },
              select: { id: true },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: [ROLES.PANEL_MEMBER, ROLES.FACULTY_ADVISER] }, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        panelAssignments: { select: { id: true } },
        defensePanels: {
          where: { schedule: { scheduledAt: { gte: new Date() }, status: 'SCHEDULED' } },
          select: { id: true },
        },
      },
    }),
    prisma.document.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { isCurrent: true, thesis: scope },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { actor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.defenseSchedule.count({
      where: { status: 'SCHEDULED', scheduledAt: { gte: new Date() }, thesis: scope },
    }),
  ]);

  const active = theses.filter((t) => t.status === THESIS_STATUS.ACTIVE).length;
  const completed = theses.filter((t) => t.status === THESIS_STATUS.COMPLETED).length;
  const archived = theses.filter((t) => t.status === THESIS_STATUS.ARCHIVED).length;
  const draft = theses.filter((t) => t.status === THESIS_STATUS.DRAFT).length;
  const finished = completed + archived;

  const stageDistribution = STAGES.map((stage) => ({
    key: stage.key,
    name: stage.name,
    count: theses.filter((t) => t.currentStage === stage.key && t.status !== THESIS_STATUS.ARCHIVED).length,
  }));

  const overdueReviews = await prisma.document.count({
    where: { isCurrent: true, status: DOCUMENT_STATUS.UNDER_REVIEW, createdAt: { lt: staleCutoff }, thesis: scope },
  });

  const programMap = new Map<string, { total: number; completed: number }>();
  for (const t of theses) {
    const entry = programMap.get(t.program) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (t.status === THESIS_STATUS.COMPLETED || t.status === THESIS_STATUS.ARCHIVED) entry.completed += 1;
    programMap.set(t.program, entry);
  }

  return {
    totals: {
      active,
      completed,
      archived,
      draft,
      all: theses.length,
      completionRate: theses.length ? Math.round((finished / theses.length) * 100) : 0,
    },
    stageDistribution,
    adviserWorkload: advisers
      .map((a) => {
        const activeGroups = a.advisedTheses.length;
        return {
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          department: a.department,
          capacity: a.advisingLoad,
          activeGroups,
          pendingReviews: a.advisedTheses.reduce((sum, t) => sum + t.documents.length, 0),
          utilisation: a.advisingLoad ? Math.round((activeGroups / a.advisingLoad) * 100) : 0,
        };
      })
      .sort((a, b) => b.utilisation - a.utilisation),
    panelWorkload: panelists
      .map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        assignments: p.panelAssignments.length,
        upcomingDefenses: p.defensePanels.length,
      }))
      .filter((p) => p.assignments > 0 || p.upcomingDefenses > 0)
      .sort((a, b) => b.assignments - a.assignments),
    documentStatus: documents.map((d) => ({ status: d.status, count: d._count._all })),
    compliance: {
      unadvisedGroups: theses.filter((t) => !t.adviserId && t.status !== THESIS_STATUS.ARCHIVED).length,
      overdueReviews,
      stalledGroups: theses.filter(
        (t) =>
          t.updatedAt < stalledCutoff &&
          t.status !== THESIS_STATUS.ARCHIVED &&
          t.status !== THESIS_STATUS.COMPLETED,
      ).length,
      upcomingDefenses,
    },
    programBreakdown: [...programMap.entries()]
      .map(([program, v]) => ({ program, ...v }))
      .sort((a, b) => b.total - a.total),
    recentActivity: auditLogs.map((log) => ({
      id: log.id,
      summary: log.summary,
      action: log.action,
      createdAt: log.createdAt,
      actor: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : null,
    })),
  };
}
