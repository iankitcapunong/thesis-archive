/** Audit trail — NFR-10, SRS 4.2 (Audit and Monitoring). */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { Card, CardHeader, EmptyState, PageHeader, Badge, formatDateTime } from '@/components/ui';
import { AUDIT_ACTIONS } from '@/lib/audit';

export const metadata: Metadata = { title: 'Audit Trail' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 60;

const ACTION_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  AUTH_LOGIN_SUCCESS: 'success',
  AUTH_LOGIN_FAILED: 'danger',
  AUTH_LOGOUT: 'neutral',
  USER_ROLE_CHANGED: 'warning',
  USER_STATUS_CHANGED: 'warning',
  MILESTONE_BLOCKED: 'warning',
  MILESTONE_APPROVED: 'success',
  DOCUMENT_EVALUATED: 'info',
  THESIS_ARCHIVED: 'info',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!can(user.role, 'audit.view')) redirect('/unauthorized');

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const where = params.action ? { action: params.action } : {};

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { firstName: true, lastName: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Audit trail"
        description="Authentication events, submissions, evaluations, approvals, role changes and administrative actions, with the acting user and timestamp."
      />

      <Card>
        <CardHeader title={`${total} recorded event${total === 1 ? '' : 's'}`} />

        <form className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <select name="action" defaultValue={params.action ?? ''} className="field-input sm:max-w-xs" aria-label="Filter by action">
            <option value="">All actions</option>
            {Object.values(AUDIT_ACTIONS).map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Filter
          </button>
        </form>

        {entries.length === 0 ? (
          <EmptyState title="No audit entries match this filter" />
        ) : (
          <div className="table-wrap">
            <table className="table min-w-[820px]">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Summary</th>
                  <th>Entity</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(entry.createdAt)}</td>
                    <td>
                      <Badge tone={ACTION_TONE[entry.action] ?? 'neutral'}>{entry.action.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'System'}
                    </td>
                    <td className="max-w-md text-sm">{entry.summary}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{entry.entityType}</td>
                    <td className="whitespace-nowrap font-mono text-[11px] text-slate-400">{entry.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/admin/audit?page=${page - 1}${params.action ? `&action=${params.action}` : ''}`}
                  className="btn-secondary btn-sm"
                >
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/admin/audit?page=${page + 1}${params.action ? `&action=${params.action}` : ''}`}
                  className="btn-secondary btn-sm"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
