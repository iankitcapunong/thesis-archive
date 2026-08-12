/** Thesis archive — FR-61 to FR-63 (visibility-governed institutional records). */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { Card, CardHeader, EmptyState, PageHeader, Badge, formatDate } from '@/components/ui';
import { Icon } from '@/components/icons';
import { OVERSIGHT_ROLES } from '@/lib/constants';

export const metadata: Metadata = { title: 'Thesis Archive' };
export const dynamic = 'force-dynamic';

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const params = await searchParams;

  // FR-63: restricted records are visible only to oversight roles.
  const visibilityFilter = OVERSIGHT_ROLES.includes(user.role as never)
    ? {}
    : { visibility: { in: ['PUBLIC', 'INSTITUTIONAL'] } };

  const where: Record<string, unknown> = { ...visibilityFilter };
  if (params.query) {
    where.OR = [
      { citation: { contains: params.query } },
      { keywords: { contains: params.query } },
      { thesis: { title: { contains: params.query } } },
    ];
  }

  const entries = await prisma.archivedThesis.findMany({
    where,
    orderBy: { archivedAt: 'desc' },
    include: {
      thesis: {
        select: {
          id: true,
          referenceNo: true,
          title: true,
          abstract: true,
          program: true,
          department: true,
          academicYear: true,
          adviser: { select: { firstName: true, lastName: true } },
          members: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
      manuscript: { select: { id: true, fileName: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Thesis archive"
        description="Completed undergraduate theses preserved as institutional records. Access follows the visibility set at the time of archiving."
      />

      <Card>
        <CardHeader title={`${entries.length} archived thesis${entries.length === 1 ? '' : 'es'}`} />

        <form className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <input
            type="search"
            name="query"
            defaultValue={params.query ?? ''}
            placeholder="Search by title, author or keyword"
            className="field-input flex-1"
            aria-label="Search the archive"
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        <div className="divide-y divide-slate-100">
          {entries.length === 0 && (
            <EmptyState
              title="No archived theses found"
              description="Completed projects appear here once a coordinator or administrator archives them."
            />
          )}

          {entries.map((entry) => (
            <article key={entry.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-csu-700">
                    {entry.thesis.program} · AY {entry.thesis.academicYear}
                  </p>
                  <Link href={`/theses/${entry.thesis.id}`} className="mt-1 block font-semibold leading-snug text-slate-900 hover:text-csu-700">
                    {entry.thesis.title}
                  </Link>
                </div>
                <Badge tone={entry.visibility === 'PUBLIC' ? 'success' : entry.visibility === 'RESTRICTED' ? 'danger' : 'neutral'}>
                  {entry.visibility}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                {entry.thesis.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join(', ')}
                {entry.thesis.adviser && ` · Adviser: ${entry.thesis.adviser.firstName} ${entry.thesis.adviser.lastName}`}
              </p>

              {entry.thesis.abstract && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{entry.thesis.abstract}</p>
              )}

              <p className="mt-3 text-xs italic text-slate-500">{entry.citation}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-400">
                  {entry.thesis.referenceNo} · archived {formatDate(entry.archivedAt)}
                </span>
                {entry.manuscript && can(user.role, 'archive.viewAll') && (
                  <a href={`/api/documents/${entry.manuscript.id}/download`} className="btn-secondary btn-sm ml-auto">
                    <Icon name="download" className="h-4 w-4" />
                    Manuscript
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </Card>
    </>
  );
}
