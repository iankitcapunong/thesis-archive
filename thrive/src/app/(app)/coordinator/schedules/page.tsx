/** Defense scheduling — FR-46, FR-47, FR-49. */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, EmptyState, PageHeader, StatusPill, Badge, formatDateTime } from '@/components/ui';
import { ScheduleForm } from './schedule-form';
import { ScheduleActions } from './schedule-actions';
import { ROLES, THESIS_STATUS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Defense Scheduling' };
export const dynamic = 'force-dynamic';

export default async function SchedulingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [theses, faculty, defenses] = await Promise.all([
    prisma.thesisProject.findMany({
      where: { status: { in: [THESIS_STATUS.ACTIVE] }, adviserId: { not: null } },
      orderBy: { referenceNo: 'asc' },
      select: {
        id: true,
        referenceNo: true,
        title: true,
        currentStage: true,
        adviserId: true,
        adviser: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: [ROLES.PANEL_MEMBER, ROLES.FACULTY_ADVISER] }, status: 'ACTIVE' },
      orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true, department: true, role: true },
    }),
    prisma.defenseSchedule.findMany({
      orderBy: { scheduledAt: 'desc' },
      include: {
        thesis: { select: { id: true, referenceNo: true, title: true } },
        panelists: { include: { panelist: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  const now = new Date();
  const upcoming = defenses.filter((d) => d.scheduledAt >= now && d.status === 'SCHEDULED');
  const others = defenses.filter((d) => !(d.scheduledAt >= now && d.status === 'SCHEDULED'));

  return (
    <>
      <PageHeader
        title="Defense scheduling"
        description="Set proposal and final defense schedules, assign panels, and record outcomes. All participants are notified automatically."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Schedule a defense" />
          <div className="p-5">
            <ScheduleForm
              theses={theses.map((t) => ({
                id: t.id,
                label: `${t.referenceNo} — ${t.title}`,
                currentStage: t.currentStage,
                adviserId: t.adviserId,
              }))}
              faculty={faculty.map((f) => ({
                id: f.id,
                name: `${f.firstName} ${f.lastName}`,
                department: f.department,
                role: f.role,
              }))}
            />
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={`Upcoming defenses (${upcoming.length})`} />
            <div className="divide-y divide-slate-100">
              {upcoming.length === 0 && <EmptyState title="No upcoming defenses" description="Use the form to set the first schedule." />}
              {upcoming.map((defense) => (
                <div key={defense.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge tone="info">{defense.defenseType === 'PROPOSAL' ? 'Proposal' : 'Final'}</Badge>
                      <Link href={`/theses/${defense.thesis.id}`} className="mt-2 block font-medium text-slate-900 hover:text-csu-700">
                        {defense.thesis.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{defense.thesis.referenceNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatDateTime(defense.scheduledAt)}</p>
                      <p className="text-xs text-slate-500">{defense.venue}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Panel: {defense.panelists.map((p) => `${p.panelist.firstName} ${p.panelist.lastName}`).join(', ')}
                  </p>

                  <div className="mt-4">
                    <ScheduleActions scheduleId={defense.id} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {others.length > 0 && (
            <Card>
              <CardHeader title="Past and closed defenses" />
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference</th>
                      <th>Type</th>
                      <th>Venue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {others.map((defense) => (
                      <tr key={defense.id}>
                        <td className="whitespace-nowrap text-xs">{formatDateTime(defense.scheduledAt)}</td>
                        <td className="whitespace-nowrap font-mono text-xs">
                          <Link href={`/theses/${defense.thesis.id}`} className="text-csu-700 hover:text-csu-800">
                            {defense.thesis.referenceNo}
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
        </div>
      </div>
    </>
  );
}
