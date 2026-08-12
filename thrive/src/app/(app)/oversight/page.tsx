/** Institutional analytics — FR-57, FR-58, FR-60. */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { buildAnalytics } from '@/lib/analytics';
import { can } from '@/lib/rbac';
import {
  Card, CardHeader, EmptyState, PageHeader, StatCard, StatusPill, ProgressBar, Badge, relativeTime,
} from '@/components/ui';
import { ROLE_LABELS, type Role } from '@/lib/constants';

export const metadata: Metadata = { title: 'Institutional Analytics' };
export const dynamic = 'force-dynamic';

const SCOPE_NOTE: Record<string, string> = {
  ADMIN: 'Institution-wide figures.',
  RESEARCH_COORDINATOR: 'Figures across your coordination scope.',
  DEPARTMENT_CHAIR: 'Figures for your department.',
  COLLEGE_ADMIN: 'Figures for your college.',
};

export default async function OversightPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!can(user.role, 'analytics.view')) redirect('/unauthorized');

  const analytics = await buildAnalytics(user);
  const { totals, stageDistribution, adviserWorkload, panelWorkload, documentStatus, compliance, programBreakdown } =
    analytics;

  const maxStage = Math.max(1, ...stageDistribution.map((s) => s.count));
  const totalDocs = documentStatus.reduce((sum, d) => sum + d.count, 0);
  const generatedAt = new Date();

  return (
    <>
      <PageHeader
        title="Institutional analytics"
        description={`${SCOPE_NOTE[user.role] ?? 'Figures visible to your role.'} Generated ${generatedAt.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} from live records.`}
        actions={
          can(user.role, 'reports.generate') && (
            <Link href="/reports" className="btn-primary">
              Generate reports
            </Link>
          )
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total projects" value={totals.all} hint={`${totals.draft} in draft`} tone="neutral" />
        <StatCard label="Active" value={totals.active} tone="brand" hint="In progress" />
        <StatCard label="Completion rate" value={`${totals.completionRate}%`} tone="success" hint={`${totals.completed + totals.archived} finished`} />
        <StatCard label="Upcoming defenses" value={compliance.upcomingDefenses} tone="info" hint="Scheduled" />
      </div>

      {/* Compliance indicators */}
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <StatCard
          label="Groups without an adviser"
          value={compliance.unadvisedGroups}
          tone={compliance.unadvisedGroups ? 'warning' : 'success'}
          hint={compliance.unadvisedGroups ? 'Coordinator action needed' : 'Fully assigned'}
        />
        <StatCard
          label="Reviews older than 7 days"
          value={compliance.overdueReviews}
          tone={compliance.overdueReviews ? 'danger' : 'success'}
          hint={compliance.overdueReviews ? 'Beyond review target' : 'Within target'}
        />
        <StatCard
          label="No activity in 30 days"
          value={compliance.stalledGroups}
          tone={compliance.stalledGroups ? 'warning' : 'success'}
          hint={compliance.stalledGroups ? 'Follow-up recommended' : 'All groups moving'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Distribution by workflow stage" />
          <div className="p-5">
            {totals.all === 0 ? (
              <EmptyState title="No thesis projects yet" />
            ) : (
              <ul className="space-y-3">
                {stageDistribution.map((stage) => (
                  <li key={stage.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-700">{stage.name}</span>
                      <span className="font-semibold text-slate-900">{stage.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-csu-600"
                        style={{ width: `${(stage.count / maxStage) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Current document status" />
          <div className="p-5">
            {totalDocs === 0 ? (
              <EmptyState title="No documents submitted yet" />
            ) : (
              <ul className="space-y-3">
                {documentStatus.map((entry) => (
                  <li key={entry.status} className="flex items-center gap-3">
                    <StatusPill status={entry.status} />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-csu-500"
                        style={{ width: `${(entry.count / totalDocs) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold text-slate-900">{entry.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Adviser workload" />
          <div className="table-wrap">
            <table className="table min-w-[520px]">
              <thead>
                <tr>
                  <th>Adviser</th>
                  <th>Groups</th>
                  <th>Utilisation</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {adviserWorkload.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                      No faculty advisers registered.
                    </td>
                  </tr>
                )}
                {adviserWorkload.map((adviser) => (
                  <tr key={adviser.id}>
                    <td>
                      <p className="font-medium text-slate-800">{adviser.name}</p>
                      <p className="text-xs text-slate-500">{adviser.department}</p>
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      {adviser.activeGroups} / {adviser.capacity}
                    </td>
                    <td className="w-40">
                      <ProgressBar percent={adviser.utilisation} label="" />
                    </td>
                    <td>
                      {adviser.pendingReviews > 0 ? (
                        <Badge tone="warning">{adviser.pendingReviews}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Panel assignments" />
          <div className="table-wrap">
            <table className="table min-w-[420px]">
              <thead>
                <tr>
                  <th>Panel member</th>
                  <th>Assignments</th>
                  <th>Upcoming defenses</th>
                </tr>
              </thead>
              <tbody>
                {panelWorkload.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm text-slate-500">
                      No panel assignments recorded.
                    </td>
                  </tr>
                )}
                {panelWorkload.map((panelist) => (
                  <tr key={panelist.id}>
                    <td className="font-medium text-slate-800">{panelist.name}</td>
                    <td>{panelist.assignments}</td>
                    <td>
                      {panelist.upcomingDefenses > 0 ? (
                        <Badge tone="info">{panelist.upcomingDefenses}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader title="Completion by program" />
          <div className="table-wrap">
            <table className="table min-w-[420px]">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Projects</th>
                  <th>Completed</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {programBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                      No data available.
                    </td>
                  </tr>
                )}
                {programBreakdown.map((program) => (
                  <tr key={program.program}>
                    <td className="font-medium text-slate-800">{program.program}</td>
                    <td>{program.total}</td>
                    <td>{program.completed}</td>
                    <td>{program.total ? Math.round((program.completed / program.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Viewing as {ROLE_LABELS[user.role as Role] ?? user.role}. Figures reflect only records within your authorised
        scope (SRS 4.5.3).
      </p>
    </>
  );
}
