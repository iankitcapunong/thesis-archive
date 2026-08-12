/** Common server-side reads shared by the dashboards. */

import 'server-only';
import { prisma } from './prisma';
import { THESIS_STATUS, DOCUMENT_STATUS } from './constants';

export async function getStudentThesis(userId: string) {
  return prisma.thesisProject.findFirst({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
    include: {
      adviser: { select: { id: true, firstName: true, lastName: true, email: true } },
      members: { include: { user: { select: { id: true, firstName: true, lastName: true, schoolId: true } } } },
      panel: { include: { panelist: { select: { firstName: true, lastName: true } } } },
      milestones: { orderBy: { sequence: 'asc' } },
      documents: {
        where: { isCurrent: true },
        include: {
          evaluations: {
            orderBy: { createdAt: 'desc' },
            include: { evaluator: { select: { firstName: true, lastName: true, role: true } } },
          },
        },
      },
      defenses: { orderBy: { scheduledAt: 'asc' } },
      adviserRequests: {
        orderBy: { createdAt: 'desc' },
        include: { adviser: { select: { firstName: true, lastName: true } } },
      },
    },
  });
}

export async function getAdviserWorkspace(adviserId: string) {
  const [theses, pendingRequests, reviewQueue] = await Promise.all([
    prisma.thesisProject.findMany({
      where: { adviserId, status: { notIn: [THESIS_STATUS.ARCHIVED] } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { include: { user: { select: { firstName: true, lastName: true } } } },
        milestones: { orderBy: { sequence: 'asc' } },
        documents: { where: { isCurrent: true }, select: { id: true, status: true } },
      },
    }),
    prisma.adviserRequest.count({ where: { adviserId, status: 'PENDING' } }),
    prisma.document.findMany({
      where: {
        isCurrent: true,
        status: DOCUMENT_STATUS.UNDER_REVIEW,
        thesis: { adviserId },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        thesis: { select: { id: true, referenceNo: true, title: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
        milestone: { select: { name: true } },
      },
    }),
  ]);

  return { theses, pendingRequests, reviewQueue };
}

export async function getPanelWorkspace(panelistId: string) {
  const [assignments, upcoming, reviewQueue] = await Promise.all([
    prisma.panelAssignment.findMany({
      where: { panelistId },
      include: {
        thesis: {
          include: {
            adviser: { select: { firstName: true, lastName: true } },
            members: { include: { user: { select: { firstName: true, lastName: true } } } },
            milestones: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    }),
    prisma.defenseSchedule.findMany({
      where: { panelists: { some: { panelistId } }, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      include: { thesis: { select: { id: true, referenceNo: true, title: true, program: true } } },
    }),
    prisma.document.findMany({
      where: {
        isCurrent: true,
        status: { in: [DOCUMENT_STATUS.UNDER_REVIEW, DOCUMENT_STATUS.PENDING] },
        thesis: { panel: { some: { panelistId } } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        thesis: { select: { id: true, referenceNo: true, title: true } },
        milestone: { select: { name: true } },
      },
    }),
  ]);

  return { assignments, upcoming, reviewQueue };
}

export function documentSummary(documents: { status: string }[]) {
  return {
    approved: documents.filter((d) => d.status === DOCUMENT_STATUS.APPROVED).length,
    awaitingReview: documents.filter((d) => d.status === DOCUMENT_STATUS.UNDER_REVIEW).length,
    needsRevision: documents.filter((d) => d.status === DOCUMENT_STATUS.REVISE).length,
    total: documents.length,
  };
}
