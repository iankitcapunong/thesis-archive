/** Thesis directory — scoped by role (FR-22, SRS 4.5.3). */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { thesisScopeFilter } from '@/lib/access';
import { STAGES, stageName } from '@/lib/workflow';
import { Card, CardHeader, EmptyState, PageHeader, StatusPill, Badge, formatDate } from '@/components/ui';
import { THESIS_STATUS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Thesis Directory' };
export const dynamic = 'force-dynamic';

const SCOPE_NOTE: Record<string, string> = {
  ADMIN: 'All thesis projects across the institution.',
  RESEARCH_COORDINATOR: 'All thesis projects within your coordination scope.',
  DEPARTMENT_CHAIR: 'Thesis projects in your department.',
  COLLEGE_ADMIN: 'Thesis projects in your college.',
  FACULTY_ADVISER: 'Thesis groups you advise.',
  PANEL_MEMBER: 'Thesis groups where you serve on the panel.',
  STUDENT: 'Your own thesis project.',
};

export default async function ThesisDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; stage?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  const where: Record<string, unknown> = { ...thesisScopeFilter(user) };
  if (params.stage) where.currentStage = params.stage;
  if (params.status) where.status = params.status;
  if (params.query) {
    where.OR = [
      { title: { contains: params.query } },
      { referenceNo: { contains: params.query } },
      { keywords: { contains: params.query } },
    ];
  }

  const theses = await prisma.thesisProject.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      adviser: { select: { firstName: true, lastName: true } },
      members: { include: { user: { select: { firstName: true, lastName: true } } } },
      milestones: { select: { status: true } },
    },
  });

  return (
    <>
      <PageHeader title="Thesis Directory" description={SCOPE_NOTE[user.role] ?? 'Thesis projects visible to you.'} />

      <Card>
        <CardHeader title={`${theses.length} thesis project${theses.length === 1 ? '' : 's'}`} />

        {/* Search and filters (FR-15 pattern applied to thesis records) */}
        {/* Two columns at tablet width, one row only once there is room for it. */}
        <form className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <input
            type="search"
            name="query"
            defaultValue={params.query ?? ''}
            placeholder="Search by title, reference number or keyword"
            className="field-input sm:col-span-2 lg:col-span-1"
            aria-label="Search theses"
          />
          <select name="stage" defaultValue={params.stage ?? ''} className="field-input" aria-label="Filter by stage">
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ''} className="field-input" aria-label="Filter by status">
            <option value="">All statuses</option>
            {Object.values(THESIS_STATUS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Apply
          </button>
        </form>

        {theses.length === 0 ? (
          <EmptyState title="No thesis projects match your filters" description="Adjust the search terms or clear the filters to see more records." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Members</th>
                  <th>Adviser</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {theses.map((thesis) => {
                  const approved = thesis.milestones.filter((m) => m.status === 'APPROVED').length;
                  return (
                    <tr key={thesis.id}>
                      <td className="whitespace-nowrap font-mono text-xs">{thesis.referenceNo}</td>
                      <td className="max-w-md">
                        <Link href={`/theses/${thesis.id}`} className="font-medium text-csu-700 hover:text-csu-800">
                          {thesis.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">{thesis.program}</p>
                      </td>
                      <td className="text-xs">
                        {thesis.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join(', ')}
                      </td>
                      <td className="whitespace-nowrap text-xs">
                        {thesis.adviser ? (
                          `${thesis.adviser.firstName} ${thesis.adviser.lastName}`
                        ) : (
                          <Badge tone="warning">Unassigned</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="text-xs">{stageName(thesis.currentStage)}</span>
                        <p className="text-[11px] text-slate-400">{approved}/{STAGES.length} approved</p>
                      </td>
                      <td>
                        <StatusPill status={thesis.status} />
                      </td>
                      <td className="whitespace-nowrap text-xs text-slate-500">{formatDate(thesis.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
