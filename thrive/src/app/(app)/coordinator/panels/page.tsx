/** Panel assignment across active thesis projects (SRS 4.5.2, FR-47). */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stageName } from '@/lib/workflow';
import { Card, CardHeader, EmptyState, PageHeader, Badge } from '@/components/ui';
import { PanelAssigner } from './panel-assigner';
import { ROLES, THESIS_STATUS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Panel Assignment' };
export const dynamic = 'force-dynamic';

export default async function PanelAssignmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [theses, faculty] = await Promise.all([
    prisma.thesisProject.findMany({
      where: { status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
      orderBy: { referenceNo: 'asc' },
      include: {
        adviser: { select: { id: true, firstName: true, lastName: true } },
        panel: { include: { panelist: { select: { id: true, firstName: true, lastName: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: [ROLES.PANEL_MEMBER, ROLES.FACULTY_ADVISER] }, status: 'ACTIVE' },
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        panelAssignments: { select: { id: true } },
      },
    }),
  ]);

  const facultyOptions = faculty.map((f) => ({
    id: f.id,
    name: `${f.firstName} ${f.lastName}`,
    department: f.department,
    assignments: f.panelAssignments.length,
  }));

  return (
    <>
      <PageHeader
        title="Panel assignment"
        description="Assign defense panels per thesis group. The assigned adviser is excluded so evaluation stays independent."
      />

      {theses.length === 0 ? (
        <Card>
          <EmptyState title="No active thesis projects" />
        </Card>
      ) : (
        <div className="space-y-5">
          {theses.map((thesis) => (
            <Card key={thesis.id}>
              <CardHeader
                title={thesis.referenceNo}
                action={<Badge tone="brand">{stageName(thesis.currentStage)}</Badge>}
              />
              <div className="p-5">
                <Link href={`/theses/${thesis.id}`} className="font-medium text-slate-900 hover:text-csu-700">
                  {thesis.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  Adviser:{' '}
                  {thesis.adviser ? `${thesis.adviser.firstName} ${thesis.adviser.lastName}` : 'Not yet assigned'}
                </p>

                <div className="mt-4">
                  <PanelAssigner
                    thesisId={thesis.id}
                    adviserId={thesis.adviserId}
                    faculty={facultyOptions}
                    current={thesis.panel.map((p) => ({ id: p.panelistId, isChair: p.panelRole === 'CHAIR' }))}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
