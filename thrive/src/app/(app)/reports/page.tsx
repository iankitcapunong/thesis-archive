/** Report generation and export — FR-59, FR-60. */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { thesisScopeFilter } from '@/lib/access';
import { can } from '@/lib/rbac';
import { Card, CardHeader, PageHeader, StatCard } from '@/components/ui';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

const REPORTS = [
  {
    type: 'thesis-progress',
    title: 'Thesis progress report',
    description:
      'Every thesis project in your scope with its stage, adviser, members, approved milestones and document counts.',
    use: 'Monitoring, compliance review, semester progress reporting.',
  },
  {
    type: 'adviser-workload',
    title: 'Adviser workload report',
    description: 'Advising capacity, active groups, utilisation and the number of submissions awaiting each adviser.',
    use: 'Load balancing and adviser assignment planning.',
  },
  {
    type: 'defense-schedule',
    title: 'Defense schedule report',
    description: 'All proposal and final defenses with date, venue, duration, panel composition and status.',
    use: 'Room booking, panel coordination, defense week planning.',
  },
  {
    type: 'document-status',
    title: 'Document status report',
    description: 'Current submissions with version, status, submitting student and the most recent evaluation decision.',
    use: 'Review turnaround monitoring and revision tracking.',
  },
];

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!can(user.role, 'reports.generate')) redirect('/unauthorized');

  const scope = thesisScopeFilter(user);
  const [theses, documents, defenses] = await Promise.all([
    prisma.thesisProject.count({ where: scope }),
    prisma.document.count({ where: { isCurrent: true, thesis: scope } }),
    prisma.defenseSchedule.count({ where: { thesis: scope } }),
  ]);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Reports are generated from live records at the moment of download, so every export reflects the most recent data."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard label="Thesis projects in scope" value={theses} />
        <StatCard label="Current documents" value={documents} />
        <StatCard label="Defense records" value={defenses} />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {REPORTS.map((report) => (
          <Card key={report.type}>
            <CardHeader title={report.title} />
            <div className="flex h-full flex-col p-5">
              <p className="text-sm leading-relaxed text-slate-600">{report.description}</p>
              <p className="mt-3 text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wide">Typical use: </span>
                {report.use}
              </p>
              <a href={`/api/reports/export?type=${report.type}`} className="btn-primary mt-5 w-fit" download>
                <Icon name="download" className="h-4 w-4" />
                Download CSV
              </a>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="About these exports" />
        <div className="space-y-2 p-5 text-sm text-slate-600">
          <p>
            Exports are scoped to your role. A department chair receives only their department&apos;s records; a
            coordinator or administrator receives the full set.
          </p>
          <p>
            Every generated report is written to the audit trail with the requesting user, report type and row count
            (NFR-10).
          </p>
          <p>
            Files are UTF-8 CSV with a byte-order mark, so they open correctly in Excel and Google Sheets without
            manual encoding changes.
          </p>
        </div>
      </Card>
    </>
  );
}
