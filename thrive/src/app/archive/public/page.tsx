/**
 * Public thesis archive.
 * Only entries archived with PUBLIC visibility are listed, and manuscripts are
 * not downloadable without an authenticated session (FR-63, Appendix 6.1).
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Card, formatDate, Badge } from '@/components/ui';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Public Thesis Archive' };
export const dynamic = 'force-dynamic';

export default async function PublicArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;

  const where: Record<string, unknown> = { visibility: 'PUBLIC' };
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
          title: true,
          abstract: true,
          program: true,
          department: true,
          academicYear: true,
          members: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Logo compact />
          <Link href="/login" className="btn-primary btn-sm shrink-0">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Public thesis archive</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Completed undergraduate theses from the College of Computing and Information Sciences released for public
            reference. Full manuscripts are available to signed-in institutional users.
          </p>
        </div>

        <form className="anim-delay-100 mt-6 flex animate-fade-up flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            type="search"
            name="query"
            defaultValue={params.query ?? ''}
            placeholder="Search by title, author or keyword"
            className="field-input sm:flex-1"
            aria-label="Search the public archive"
          />
          <button type="submit" className="btn-primary sm:shrink-0">
            Search
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          {entries.length} published thesis{entries.length === 1 ? '' : 'es'}
        </p>

        <div className="stagger mt-4 space-y-4">
          {entries.length === 0 && (
            <Card className="p-6 text-center sm:p-8">
              <p className="text-sm font-medium text-slate-700">No published theses match your search</p>
              <p className="mt-1 text-sm text-slate-500">Try a different keyword, or browse the full list.</p>
            </Card>
          )}

          {entries.map((entry) => (
            <Card key={entry.id} className="card-interactive p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-csu-700">
                  {entry.thesis.program} · AY {entry.thesis.academicYear}
                </p>
                <Badge tone="success">Public</Badge>
              </div>
              <h2 className="mt-2 font-semibold leading-snug text-slate-900">{entry.thesis.title}</h2>
              <p className="mt-1.5 text-sm text-slate-600">
                {entry.thesis.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join(', ')}
              </p>
              {entry.thesis.abstract && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{entry.thesis.abstract}</p>
              )}
              {entry.keywords && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.keywords.split(',').map((keyword) => (
                    <Badge key={keyword} tone="neutral">
                      {keyword.trim()}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs italic text-slate-500">{entry.citation}</p>
              <p className="mt-1 text-xs text-slate-400">Archived {formatDate(entry.archivedAt)}</p>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 pb-safe-6 text-xs text-slate-500 sm:px-6 sm:text-sm">
          Caraga State University · College of Computing and Information Sciences
        </div>
      </footer>
    </div>
  );
}
