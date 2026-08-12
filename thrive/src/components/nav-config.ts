/** Role-aware navigation (FR-53, SRS 4.3.1 — role-specific navigation). */

import { ROLES, type Role } from '@/lib/constants';

export type NavItem = { href: string; label: string; icon: string };
export type NavSection = { heading: string; items: NavItem[] };

const THESIS_DIRECTORY: NavItem = { href: '/theses', label: 'Thesis Directory', icon: 'folder' };
const ARCHIVE: NavItem = { href: '/archive', label: 'Thesis Archive', icon: 'archive' };
const NOTIFICATIONS: NavItem = { href: '/notifications', label: 'Notifications', icon: 'bell' };
const PROFILE: NavItem = { href: '/profile', label: 'My Profile', icon: 'user' };
const REPORTS: NavItem = { href: '/reports', label: 'Reports', icon: 'report' };
const ANALYTICS: NavItem = { href: '/oversight', label: 'Analytics', icon: 'chart' };

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  [ROLES.STUDENT]: [
    {
      heading: 'Thesis',
      items: [
        { href: '/student', label: 'My Dashboard', icon: 'home' },
        { href: '/student/adviser', label: 'Find an Adviser', icon: 'users' },
        THESIS_DIRECTORY,
        ARCHIVE,
      ],
    },
    { heading: 'Account', items: [NOTIFICATIONS, PROFILE] },
  ],

  [ROLES.FACULTY_ADVISER]: [
    {
      heading: 'Supervision',
      items: [
        { href: '/adviser', label: 'My Dashboard', icon: 'home' },
        { href: '/adviser/requests', label: 'Adviser Requests', icon: 'inbox' },
        { href: '/adviser/reviews', label: 'Review Queue', icon: 'check' },
        THESIS_DIRECTORY,
        ARCHIVE,
      ],
    },
    { heading: 'Account', items: [NOTIFICATIONS, PROFILE] },
  ],

  [ROLES.PANEL_MEMBER]: [
    {
      heading: 'Evaluation',
      items: [
        { href: '/panel', label: 'My Dashboard', icon: 'home' },
        { href: '/panel/schedules', label: 'Defense Schedule', icon: 'calendar' },
        THESIS_DIRECTORY,
        ARCHIVE,
      ],
    },
    { heading: 'Account', items: [NOTIFICATIONS, PROFILE] },
  ],

  [ROLES.RESEARCH_COORDINATOR]: [
    {
      heading: 'Coordination',
      items: [
        { href: '/coordinator', label: 'My Dashboard', icon: 'home' },
        { href: '/coordinator/schedules', label: 'Defense Scheduling', icon: 'calendar' },
        { href: '/coordinator/panels', label: 'Panel Assignment', icon: 'users' },
        THESIS_DIRECTORY,
      ],
    },
    { heading: 'Institutional', items: [ANALYTICS, REPORTS, ARCHIVE] },
    { heading: 'Account', items: [NOTIFICATIONS, PROFILE] },
  ],

  [ROLES.DEPARTMENT_CHAIR]: [
    { heading: 'Oversight', items: [{ href: '/oversight', label: 'Analytics', icon: 'chart' }, THESIS_DIRECTORY, REPORTS, ARCHIVE] },
    { heading: 'Account', items: [NOTIFICATIONS, PROFILE] },
  ],

  [ROLES.COLLEGE_ADMIN]: [
    { heading: 'Oversight', items: [{ href: '/oversight', label: 'Analytics', icon: 'chart' }, THESIS_DIRECTORY, REPORTS, ARCHIVE] },
    { heading: 'Account', items: [NOTIFICATIONS, PROFILE] },
  ],

  [ROLES.ADMIN]: [
    {
      heading: 'Administration',
      items: [
        { href: '/admin', label: 'My Dashboard', icon: 'home' },
        { href: '/admin/users', label: 'User Management', icon: 'users' },
        { href: '/admin/roles', label: 'Roles & Permissions', icon: 'shield' },
        { href: '/admin/audit', label: 'Audit Trail', icon: 'list' },
      ],
    },
    { heading: 'Academic', items: [THESIS_DIRECTORY, ANALYTICS, REPORTS, ARCHIVE] },
    { heading: 'Account', items: [NOTIFICATIONS, PROFILE] },
  ],
};

export function navFor(role: string): NavSection[] {
  return NAV_BY_ROLE[role as Role] ?? [];
}
