/**
 * Role-Based Access Control (FR-10, FR-13, NFR-06, SRS 4.5.3, Appendix 6.1).
 *
 * Two layers of control:
 *   1. Capability layer  - what a role may do at all (this matrix).
 *   2. Scope layer       - which records that role may touch (`scopeForThesis`).
 *
 * Every privileged API route resolves both layers server-side before acting.
 */

import { ROLES, type Role } from './constants';

export const PERMISSIONS = {
  // System access
  'auth.login': 'Login / Logout',

  // User & access management
  'users.view': 'View user directory',
  'users.create': 'Create user account',
  'users.update': 'Update user information',
  'users.assignRole': 'Assign / change roles',
  'users.setStatus': 'Activate / deactivate accounts',

  // Thesis management
  'thesis.register': 'Register thesis project',
  'thesis.viewAll': 'View all thesis projects',
  'thesis.viewScoped': 'View thesis projects in scope',
  'thesis.update': 'Update thesis information',
  'thesis.manageMembers': 'Manage thesis members',

  // Adviser management
  'adviser.request': 'Submit adviser request',
  'adviser.respond': 'Respond to adviser requests',
  'adviser.assign': 'Assign or override advisers',
  'panel.assign': 'Assign panel members',

  // Documents
  'document.upload': 'Upload thesis documents',
  'document.viewAssigned': 'View documents of assigned theses',
  'document.viewAll': 'View all thesis documents',

  // Evaluation & workflow
  'evaluation.create': 'Evaluate documents and record decisions',
  'workflow.advance': 'Advance thesis milestones',
  'workflow.override': 'Override workflow restrictions',

  // Defense scheduling
  'defense.manage': 'Create and manage defense schedules',
  'defense.viewAssigned': 'View assigned defense schedules',

  // Analytics, reporting, archive
  'analytics.view': 'View institutional analytics',
  'reports.generate': 'Generate and export reports',
  'archive.create': 'Archive completed theses',
  'archive.viewAll': 'Access full thesis archive',
  'audit.view': 'View audit logs',
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Capability matrix.
 *
 * NOTE: SRS Appendix Table 6.1 marks "Create User Account" and
 * "Activate / Deactivate Accounts" as available to every role. That conflicts
 * with the normative requirements FR-06, FR-16 and FR-17, which reserve those
 * actions for authorized administrators. The functional requirements take
 * precedence here; see docs/REQUIREMENTS-TRACEABILITY.md.
 */
const MATRIX: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    'auth.login',
    'users.view', 'users.create', 'users.update', 'users.assignRole', 'users.setStatus',
    'thesis.viewAll', 'thesis.update', 'thesis.manageMembers',
    'adviser.assign', 'panel.assign',
    'document.viewAll',
    'workflow.advance', 'workflow.override',
    'defense.manage', 'defense.viewAssigned',
    'analytics.view', 'reports.generate',
    'archive.create', 'archive.viewAll',
    'audit.view',
  ],

  [ROLES.RESEARCH_COORDINATOR]: [
    'auth.login',
    'users.view', 'users.create',
    'thesis.viewScoped', 'thesis.update', 'thesis.manageMembers',
    'adviser.assign', 'panel.assign',
    'document.viewAll',
    'workflow.advance',
    'defense.manage', 'defense.viewAssigned',
    'analytics.view', 'reports.generate',
    'archive.create', 'archive.viewAll',
    'audit.view',
  ],

  [ROLES.DEPARTMENT_CHAIR]: [
    'auth.login',
    'users.view',
    'thesis.viewScoped',
    'document.viewAll',
    'defense.viewAssigned',
    'analytics.view', 'reports.generate',
    'archive.viewAll',
  ],

  [ROLES.COLLEGE_ADMIN]: [
    'auth.login',
    'users.view',
    'thesis.viewScoped',
    'document.viewAll',
    'defense.viewAssigned',
    'analytics.view', 'reports.generate',
    'archive.viewAll',
  ],

  [ROLES.FACULTY_ADVISER]: [
    'auth.login',
    'thesis.viewScoped', 'thesis.update',
    'adviser.respond',
    'document.viewAssigned',
    'evaluation.create',
    'workflow.advance',
    'defense.viewAssigned',
    'archive.viewAll',
  ],

  [ROLES.PANEL_MEMBER]: [
    'auth.login',
    'thesis.viewScoped',
    'document.viewAssigned',
    'evaluation.create',
    'defense.viewAssigned',
    'archive.viewAll',
  ],

  [ROLES.STUDENT]: [
    'auth.login',
    'thesis.register', 'thesis.viewScoped', 'thesis.update', 'thesis.manageMembers',
    'adviser.request',
    'document.upload', 'document.viewAssigned',
    'defense.viewAssigned',
    'archive.viewAll',
  ],
};

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role as Role]?.includes(permission) ?? false;
}

export function canAny(role: string | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function permissionsFor(role: string): Permission[] {
  return MATRIX[role as Role] ?? [];
}

export function permissionMatrix() {
  return MATRIX;
}

/** Landing route per role after login (FR-53). */
export function homeRouteFor(role: string): string {
  switch (role) {
    case ROLES.ADMIN:
      return '/admin';
    case ROLES.RESEARCH_COORDINATOR:
      return '/coordinator';
    case ROLES.DEPARTMENT_CHAIR:
    case ROLES.COLLEGE_ADMIN:
      return '/oversight';
    case ROLES.FACULTY_ADVISER:
      return '/adviser';
    case ROLES.PANEL_MEMBER:
      return '/panel';
    case ROLES.STUDENT:
      return '/student';
    default:
      return '/dashboard';
  }
}

/** Route prefixes each role may enter; enforced again in middleware (FR-11, FR-12). */
export const ROLE_ROUTE_PREFIXES: Record<Role, string[]> = {
  [ROLES.ADMIN]: ['/admin', '/coordinator', '/oversight', '/theses', '/archive', '/notifications', '/profile', '/reports'],
  [ROLES.RESEARCH_COORDINATOR]: ['/coordinator', '/oversight', '/theses', '/archive', '/notifications', '/profile', '/reports'],
  [ROLES.DEPARTMENT_CHAIR]: ['/oversight', '/theses', '/archive', '/notifications', '/profile', '/reports'],
  [ROLES.COLLEGE_ADMIN]: ['/oversight', '/theses', '/archive', '/notifications', '/profile', '/reports'],
  [ROLES.FACULTY_ADVISER]: ['/adviser', '/theses', '/archive', '/notifications', '/profile'],
  [ROLES.PANEL_MEMBER]: ['/panel', '/theses', '/archive', '/notifications', '/profile'],
  [ROLES.STUDENT]: ['/student', '/theses', '/archive', '/notifications', '/profile'],
};

export function mayEnterRoute(role: string, pathname: string): boolean {
  const prefixes = ROLE_ROUTE_PREFIXES[role as Role];
  if (!prefixes) return false;
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Every route area the application defines, across all roles. */
const KNOWN_PREFIXES = [...new Set(Object.values(ROLE_ROUTE_PREFIXES).flat())];

/**
 * Distinguishes "this area exists but is not yours" from "no such page", so a
 * mistyped URL reaches the not-found page rather than the access-denied page
 * (NFR-16).
 */
export function isKnownRoute(pathname: string): boolean {
  return KNOWN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
