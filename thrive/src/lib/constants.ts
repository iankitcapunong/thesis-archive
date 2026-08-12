/**
 * Shared vocabulary for Project THRIVE.
 * Mirrors the user classes (SRS 2.4) and status vocabulary (SRS 3.3.1).
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  RESEARCH_COORDINATOR: 'RESEARCH_COORDINATOR',
  DEPARTMENT_CHAIR: 'DEPARTMENT_CHAIR',
  COLLEGE_ADMIN: 'COLLEGE_ADMIN',
  FACULTY_ADVISER: 'FACULTY_ADVISER',
  PANEL_MEMBER: 'PANEL_MEMBER',
  STUDENT: 'STUDENT',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  RESEARCH_COORDINATOR: 'Research Coordinator',
  DEPARTMENT_CHAIR: 'Department Chair',
  COLLEGE_ADMIN: 'College Administrator',
  FACULTY_ADVISER: 'Faculty Adviser',
  PANEL_MEMBER: 'Panel Member',
  STUDENT: 'Student',
};

/** Roles that evaluate submitted work (FR-37). */
export const EVALUATOR_ROLES: Role[] = [ROLES.FACULTY_ADVISER, ROLES.PANEL_MEMBER];

/** Roles with institution-wide oversight (SRS 4.5.3). */
export const OVERSIGHT_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.RESEARCH_COORDINATOR,
  ROLES.DEPARTMENT_CHAIR,
  ROLES.COLLEGE_ADMIN,
];

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
} as const;

export const THESIS_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export const MILESTONE_STATUS = {
  LOCKED: 'LOCKED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
} as const;

export const DOCUMENT_STATUS = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REVISE: 'REVISE',
  REJECTED: 'REJECTED',
} as const;

export const DECISION = {
  APPROVED: 'APPROVED',
  REVISE: 'REVISE',
  REJECTED: 'REJECTED',
} as const;

export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export const DEFENSE_TYPE = {
  PROPOSAL: 'PROPOSAL',
  FINAL: 'FINAL',
} as const;

export const DEFENSE_STATUS = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  RESCHEDULED: 'RESCHEDULED',
} as const;

export const NOTIFICATION_CATEGORY = {
  SUBMISSION: 'SUBMISSION',
  EVALUATION: 'EVALUATION',
  ADVISER: 'ADVISER',
  SCHEDULE: 'SCHEDULE',
  WORKFLOW: 'WORKFLOW',
  ACCOUNT: 'ACCOUNT',
} as const;

/** Upload rules enforced server-side (FR-34, SRS 4.2 File and Document Security). */
export const UPLOAD_RULES = {
  maxBytes: 20 * 1024 * 1024, // 20 MB
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
  ] as string[],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'] as string[],
};

/**
 * Self-registration is limited to institutional addresses (FR-06). A Caraga
 * State University Google Workspace account is the same address, so signing up
 * with the university's Gmail satisfies this without a separate path.
 */
export const INSTITUTIONAL_EMAIL_DOMAIN = 'carsu.edu.ph';

export function isInstitutionalEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${INSTITUTIONAL_EMAIL_DOMAIN}`);
}

/**
 * Degree programs, grouped by the college that owns them.
 *
 * The seven colleges are the constituent colleges of the Caraga State
 * University main campus. Only the College of Computing and Information
 * Sciences is populated: it is the SRS pilot scope, and the remaining rosters
 * must be transcribed from the university's official offerings rather than
 * guessed at — a wrong program name here follows a student through their whole
 * record. Colleges with no programs listed are skipped in the picker, so
 * filling one in is the only step needed to switch it on.
 */
export const PROGRAMS_BY_COLLEGE: { college: string; programs: string[] }[] = [
  {
    college: 'College of Computing and Information Sciences',
    programs: ['BS Computer Science', 'BS Information Technology', 'BS Information Systems', 'BS Data Science'],
  },
  { college: 'College of Engineering and Geosciences', programs: [] },
  { college: 'College of Agriculture and Agri-Industries', programs: [] },
  { college: 'College of Forestry and Environmental Sciences', programs: [] },
  { college: 'College of Mathematics and Natural Sciences', programs: [] },
  { college: 'College of Education', programs: [] },
  { college: 'College of Humanities and Social Sciences', programs: [] },
];

/** Flat list used for server-side validation. */
export const ACADEMIC_PROGRAMS: string[] = PROGRAMS_BY_COLLEGE.flatMap((c) => c.programs);

/**
 * Escape hatch so an unlisted program never blocks registration. Stored as-is
 * and corrected by the coordinator during onboarding.
 */
export const PROGRAM_OTHER = 'Not listed — my program is not shown';

export const DEPARTMENTS = [
  'Department of Computer Science',
  'Department of Information Technology',
  'Department of Information Systems',
];
