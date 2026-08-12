/** Adviser request inbox — FR-26, FR-27. */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, EmptyState, PageHeader, StatusPill, formatDate, relativeTime } from '@/components/ui';
import { RequestActions } from './request-actions';
import { THESIS_STATUS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Adviser Requests' };
export const dynamic = 'force-dynamic';

export default async function AdviserRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [requests, activeGroups, profile] = await Promise.all([
    prisma.adviserRequest.findMany({
      where: { adviserId: user.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        thesis: {
          select: {
            id: true,
            referenceNo: true,
            title: true,
            abstract: true,
            program: true,
            department: true,
            members: { include: { user: { select: { firstName: true, lastName: true, schoolId: true } } } },
          },
        },
      },
    }),
    prisma.thesisProject.count({
      where: { adviserId: user.id, status: { in: [THESIS_STATUS.ACTIVE, THESIS_STATUS.DRAFT] } },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { advisingLoad: true } }),
  ]);

  const capacity = profile?.advisingLoad ?? 0;
  const atCapacity = activeGroups >= capacity;
  const pending = requests.filter((r) => r.status === 'PENDING');
  const resolved = requests.filter((r) => r.status !== 'PENDING');

  return (
    <>
      <PageHeader
        title="Adviser requests"
        description={`You are supervising ${activeGroups} of ${capacity} groups. Accepting a request assigns you as adviser and closes the group's other pending requests.`}
      />

      {atCapacity && pending.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          You have reached your advising load of {capacity} groups. New requests cannot be accepted until a group
          completes or your capacity is raised by the administrator.
        </div>
      )}

      <Card>
        <CardHeader title={`Pending requests (${pending.length})`} />
        <div className="divide-y divide-slate-100">
          {pending.length === 0 && <EmptyState title="No pending requests" description="Requests from student groups will appear here." />}
          {pending.map((request) => (
            <div key={request.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{request.thesis.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {request.thesis.referenceNo} · {request.thesis.program} · requested {relativeTime(request.createdAt)}
                  </p>
                </div>
                <StatusPill status={request.status} />
              </div>

              <p className="mt-3 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Members: </span>
                {request.thesis.members
                  .map((m) => `${m.user.firstName} ${m.user.lastName}${m.user.schoolId ? ` (${m.user.schoolId})` : ''}`)
                  .join(', ')}
              </p>

              {request.thesis.abstract && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                  {request.thesis.abstract}
                </p>
              )}

              {request.message && (
                <blockquote className="mt-3 border-l-2 border-csu-300 pl-3 text-sm italic text-slate-600">
                  {request.message}
                </blockquote>
              )}

              <div className="mt-4">
                <RequestActions requestId={request.id} disabled={atCapacity} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {resolved.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Past requests" />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Requested</th>
                  <th>Responded</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((request) => (
                  <tr key={request.id}>
                    <td className="whitespace-nowrap font-mono text-xs">{request.thesis.referenceNo}</td>
                    <td className="max-w-sm">{request.thesis.title}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(request.createdAt)}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(request.respondedAt)}</td>
                    <td>
                      <StatusPill status={request.status} />
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
