/** Panel member defense calendar — FR-48. */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, EmptyState, PageHeader, StatusPill, Badge, formatDateTime } from '@/components/ui';

export const metadata: Metadata = { title: 'Defense Schedule' };
export const dynamic = 'force-dynamic';

export default async function PanelSchedulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const defenses = await prisma.defenseSchedule.findMany({
    where: { panelists: { some: { panelistId: user.id } } },
    orderBy: { scheduledAt: 'desc' },
    include: {
      thesis: {
        select: {
          id: true,
          referenceNo: true,
          title: true,
          program: true,
          members: { include: { user: { select: { firstName: true, lastName: true } } } },
          adviser: { select: { firstName: true, lastName: true } },
        },
      },
      panelists: { include: { panelist: { select: { firstName: true, lastName: true } } } },
    },
  });

  const now = new Date();
  const upcoming = defenses.filter((d) => d.scheduledAt >= now && d.status === 'SCHEDULED');
  const past = defenses.filter((d) => !(d.scheduledAt >= now && d.status === 'SCHEDULED'));

  return (
    <>
      <PageHeader title="My defense schedule" description="Proposal and final defenses where you are an assigned panel member." />

      <Card>
        <CardHeader title={`Upcoming (${upcoming.length})`} />
        <div className="divide-y divide-slate-100">
          {upcoming.length === 0 && <EmptyState title="No upcoming defenses" description="Scheduled defenses appear here as soon as the coordinator sets them." />}
          {upcoming.map((defense) => (
            <div key={defense.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{defense.defenseType === 'PROPOSAL' ? 'Proposal defense' : 'Final defense'}</Badge>
                    {defense.panelists.find((p) => p.panelistId === user.id)?.panelRole === 'CHAIR' && (
                      <Badge tone="brand">You chair this panel</Badge>
                    )}
                  </div>
                  <Link href={`/theses/${defense.thesis.id}`} className="mt-2 block font-medium text-slate-900 hover:text-csu-700">
                    {defense.thesis.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {defense.thesis.referenceNo} · {defense.thesis.program}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatDateTime(defense.scheduledAt)}</p>
                  <p className="text-xs text-slate-500">{defense.venue}</p>
                  <p className="text-xs text-slate-400">{defense.durationMin} minutes</p>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Group</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {defense.thesis.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Adviser</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {defense.thesis.adviser
                      ? `${defense.thesis.adviser.firstName} ${defense.thesis.adviser.lastName}`
                      : 'Unassigned'}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Panel</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {defense.panelists.map((p) => `${p.panelist.firstName} ${p.panelist.lastName}`).join(', ')}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </Card>

      {past.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Past and closed defenses" />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Venue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map((defense) => (
                  <tr key={defense.id}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(defense.scheduledAt)}</td>
                    <td className="whitespace-nowrap font-mono text-xs">{defense.thesis.referenceNo}</td>
                    <td className="max-w-sm">
                      <Link href={`/theses/${defense.thesis.id}`} className="text-csu-700 hover:text-csu-800">
                        {defense.thesis.title}
                      </Link>
                    </td>
                    <td className="text-xs">{defense.defenseType}</td>
                    <td className="text-xs">{defense.venue}</td>
                    <td>
                      <StatusPill status={defense.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
