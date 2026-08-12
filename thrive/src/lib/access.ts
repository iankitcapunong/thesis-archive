/**
 * Record-level access scoping (FR-13, FR-22, FR-31, SRS 4.5.3).
 *
 * The RBAC matrix answers "may this role do X at all"; this module answers
 * "may this user do X to *this* thesis". Both are checked server-side.
 */

import 'server-only';
import { prisma } from './prisma';
import { ROLES } from './constants';
import type { SessionUser } from './auth';

export type ThesisAccess = {
  canView: boolean;
  canEdit: boolean;
  canUpload: boolean;
  canEvaluate: boolean;
  canManageWorkflow: boolean;
  canManageMembers: boolean;
  relation: 'MEMBER' | 'ADVISER' | 'PANELIST' | 'OVERSIGHT' | 'NONE';
};

const DENIED: ThesisAccess = {
  canView: false,
  canEdit: false,
  canUpload: false,
  canEvaluate: false,
  canManageWorkflow: false,
  canManageMembers: false,
  relation: 'NONE',
};

export async function resolveThesisAccess(user: SessionUser, thesisId: string): Promise<ThesisAccess> {
  const thesis = await prisma.thesisProject.findUnique({
    where: { id: thesisId },
    select: {
      id: true,
      adviserId: true,
      department: true,
      college: true,
      status: true,
      members: { select: { userId: true } },
      panel: { select: { panelistId: true } },
    },
  });
  if (!thesis) return DENIED;

  // Administrators and coordinators have institutional oversight.
  if (user.role === ROLES.ADMIN || user.role === ROLES.RESEARCH_COORDINATOR) {
    return {
      canView: true,
      canEdit: true,
      canUpload: false,
      canEvaluate: false,
      canManageWorkflow: true,
      canManageMembers: true,
      relation: 'OVERSIGHT',
    };
  }

  // Chairs and college administrators monitor but do not modify records.
  if (user.role === ROLES.DEPARTMENT_CHAIR || user.role === ROLES.COLLEGE_ADMIN) {
    const inScope =
      user.role === ROLES.COLLEGE_ADMIN
        ? thesis.college === user.college
        : thesis.department === user.department;
    return inScope ? { ...DENIED, canView: true, relation: 'OVERSIGHT' } : DENIED;
  }

  if (thesis.adviserId === user.id) {
    return {
      canView: true,
      canEdit: true,
      canUpload: false,
      canEvaluate: true,
      canManageWorkflow: true,
      canManageMembers: false,
      relation: 'ADVISER',
    };
  }

  if (thesis.panel.some((p) => p.panelistId === user.id)) {
    return { ...DENIED, canView: true, canEvaluate: true, relation: 'PANELIST' };
  }

  if (thesis.members.some((m) => m.userId === user.id)) {
    const mutable = thesis.status === 'ACTIVE' || thesis.status === 'DRAFT';
    return {
      canView: true,
      canEdit: mutable,
      canUpload: mutable,
      canEvaluate: false,
      canManageWorkflow: false,
      canManageMembers: mutable,
      relation: 'MEMBER',
    };
  }

  return DENIED;
}

/** Prisma `where` fragment limiting a thesis listing to the caller's scope. */
export function thesisScopeFilter(user: SessionUser) {
  switch (user.role) {
    case ROLES.ADMIN:
    case ROLES.RESEARCH_COORDINATOR:
      return {};
    case ROLES.COLLEGE_ADMIN:
      return { college: user.college };
    case ROLES.DEPARTMENT_CHAIR:
      return user.department ? { department: user.department } : {};
    case ROLES.FACULTY_ADVISER:
      return { adviserId: user.id };
    case ROLES.PANEL_MEMBER:
      return { panel: { some: { panelistId: user.id } } };
    case ROLES.STUDENT:
      return { members: { some: { userId: user.id } } };
    default:
      // Unknown role sees nothing rather than everything.
      return { id: '__none__' };
  }
}
