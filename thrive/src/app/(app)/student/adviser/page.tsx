/** Adviser discovery and request (FR-24, FR-25, FR-27). */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStudentThesis } from '@/lib/queries';
import { PageHeader, Card, CardHeader, EmptyState, StatusPill, formatDate } from '@/components/ui';
import { AdviserDirectory } from './adviser-directory';
import { ROLES, THESIS_STATUS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Find an adviser' };
export const dynamic = 'force-dynamic';

export default async function FindAdviserPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const thesis = await getStudentThesis(user.id);

  if (!thesis) {
    return (
      <>
        <PageHeader title="Find an adviser" />
        <Card>
          <EmptyState
            title="Register your thesis project first"
            description="An adviser request is tied to a registered thesis project."
            action={
              <Link href="/student/register" className="btn-primary">
                Register a thesis project
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const advisers = await prisma.user.findMany({
    where: { role: ROLES.FACULTY_ADVISER, status: 'ACTIVE' },
    orderBy: [{ lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
      advisingLoad: true,
      advisedTheses: {
        where: { status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
        select: { id: true },
      },
    },
  });

  const directory = advisers.map((a) => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`,
    email: a.email,
    department: a.department,
    capacity: a.advisingLoad,
    activeGroups: a.advisedTheses.length,
    slotsRemaining: Math.max(0, a.advisingLoad - a.advisedTheses.length),
  }));

  const pending = thesis.adviserRequests.find((r) => r.status === 'PENDING');

  return (
    <>
      <PageHeader
        title="Find an adviser"
        description={`Requesting an adviser for ${thesis.referenceNo}. Only one request can be outstanding at a time.`}
      />

      {thesis.adviser ? (
        <Card>
          <CardHeader title="Assigned adviser" />
          <div className="p-5">
            <p className="text-lg font-semibold text-slate-900">
              {thesis.adviser.firstName} {thesis.adviser.lastName}
            </p>
            <p className="mt-1 text-sm text-slate-600">{thesis.adviser.email}</p>
            <p className="mt-4 text-sm text-slate-500">
              Your group already has an assigned adviser, so no further requests are needed.
            </p>
            <Link href={`/theses/${thesis.id}`} className="btn-primary mt-4">
              Open thesis workspace
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AdviserDirectory
              advisers={directory}
              thesisId={thesis.id}
              preferredDepartment={thesis.department}
              hasPendingRequest={Boolean(pending)}
            />
          </div>

          <Card className="h-fit">
            <CardHeader title="Request history" />
            <div className="divide-y divide-slate-100">
              {thesis.adviserRequests.length === 0 && (
                <EmptyState title="No requests sent yet" description="Select a faculty adviser to send your first request." />
              )}
              {thesis.adviserRequests.map((request) => (
                <div key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {request.adviser.firstName} {request.adviser.lastName}
                      </p>
                      <p className="text-xs text-slate-500">Sent {formatDate(request.createdAt)}</p>
                    </div>
                    <StatusPill status={request.status} />
                  </div>
                  {request.response && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{request.response}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
