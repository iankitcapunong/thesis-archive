/**
 * Audit trail (NFR-10, SRS 4.2 Audit and Monitoring, SRS 4.5.4 Audit Lifecycle).
 * Audit writes never block the caller's operation.
 */

import 'server-only';
import { prisma } from './prisma';

export type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] failed to persist audit entry', error);
  }
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  LOGOUT: 'AUTH_LOGOUT',
  PASSWORD_RESET_REQUEST: 'AUTH_PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'AUTH_PASSWORD_RESET_COMPLETE',
  USER_CREATED: 'USER_CREATED',
  USER_REGISTERED: 'USER_SELF_REGISTERED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  THESIS_REGISTERED: 'THESIS_REGISTERED',
  THESIS_UPDATED: 'THESIS_UPDATED',
  THESIS_MEMBER_ADDED: 'THESIS_MEMBER_ADDED',
  THESIS_MEMBER_REMOVED: 'THESIS_MEMBER_REMOVED',
  ADVISER_REQUESTED: 'ADVISER_REQUESTED',
  ADVISER_RESPONDED: 'ADVISER_RESPONDED',
  PANEL_ASSIGNED: 'PANEL_ASSIGNED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
  DOCUMENT_EVALUATED: 'DOCUMENT_EVALUATED',
  MILESTONE_APPROVED: 'MILESTONE_APPROVED',
  MILESTONE_BLOCKED: 'MILESTONE_BLOCKED',
  DEFENSE_SCHEDULED: 'DEFENSE_SCHEDULED',
  DEFENSE_UPDATED: 'DEFENSE_UPDATED',
  THESIS_ARCHIVED: 'THESIS_ARCHIVED',
  REPORT_GENERATED: 'REPORT_GENERATED',
} as const;
