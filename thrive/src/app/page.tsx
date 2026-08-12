/**
 * Public landing page (SRS Figure 6.1).
 * Publicly visible archive entries are surfaced here; everything else requires
 * authentication (Appendix 6.1 — Public column).
 */

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Badge, Card, formatDate } from '@/components/ui';
import { Logo } from '@/components/logo';

export const dynamic = 'force-dynamic';

const CAPABILITIES = [
  {
    title: 'Workflow-driven lifecycle',
    body: 'Registration, adviser assignment, proposal defense, revisions, final defense and completion follow one enforced institutional sequence.',
  },
  {
    title: 'Document lifecycle management',
    body: 'Every submission is versioned, evaluated and traceable — from first draft to the signed approval sheet.',
  },
  {
    title: 'Evaluation and approval',
    body: 'Advisers and panel members record decisions and remarks against specific documents, with full history retained.',
  },
  {
    title: 'Progress monitoring',
    body: 'Students, advisers and coordinators see the same milestone status, pending requirements and completion percentage.',
  },
  {
    title: 'Institutional analytics',
    body: 'Completion rates, adviser workload, panel assignments and compliance indicators for evidence-based planning.',
  },
  {
    title: 'Governed archiving',
    body: 'Completed manuscripts are preserved as institutional records with controlled visibility and citation metadata.',
  },
];

export default async function LandingPage() {
  const [published, stats] = await Promise.all([
    prisma.archivedThesis.findMany({
      where: { visibility: 'PUBLIC' },
      include: {
        thesis: { select: { title: true, program: true, academicYear: true, department: true } },
      },
      orderBy: { archivedAt: 'desc' },
      take: 6,
    }),
    Promise.all([
      prisma.thesisProject.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'FACULTY_ADVISER' } }),
      prisma.archivedThesis.count(),
    ]),
  ]);

  const [activeTheses, advisers, archived] = stats;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/archive/public" className="btn-ghost btn-sm">
              Thesis archive
            </Link>
            <Link href="/login" className="btn-primary btn-sm">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-br from-csu-800 via-csu-700 to-csu-600 text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <Badge tone="neutral" className="bg-white/15 text-white ring-white/25">
              College of Computing and Information Sciences · Pilot Implementation
            </Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Thesis Hub for Research, Innovation, Validation and Evaluation
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-csu-50">
              An intelligent academic governance platform that manages the complete undergraduate thesis lifecycle
              at Caraga State University — from registration through defense, approval and institutional archiving.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn bg-white px-5 py-2.5 font-semibold text-csu-700 hover:bg-csu-50">
                Sign in to THRIVE
              </Link>
              <Link
                href="/archive/public"
                className="btn border border-white/40 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
              >
                Browse published theses
              </Link>
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                ['Active thesis projects', activeTheses],
                ['Faculty advisers', advisers],
                ['Archived manuscripts', archived],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15">
                  <dt className="text-xs font-medium uppercase tracking-wide text-csu-100">{label}</dt>
                  <dd className="mt-1 text-3xl font-semibold">{value as number}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">What the platform governs</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            THRIVE replaces fragmented manual coordination with one enforced process, shared by every stakeholder.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <Card key={item.title} className="p-5">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {published.length > 0 && (
          <section className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Recently published research</h2>
                  <p className="mt-2 text-slate-600">Completed undergraduate theses released for public reference.</p>
                </div>
                <Link href="/archive/public" className="btn-secondary btn-sm">
                  View full archive
                </Link>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {published.map((entry) => (
                  <Card key={entry.id} className="p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-csu-700">
                      {entry.thesis.program} · AY {entry.thesis.academicYear}
                    </p>
                    <h3 className="mt-2 font-semibold leading-snug text-slate-900">{entry.thesis.title}</h3>
                    <p className="mt-3 text-sm text-slate-600">{entry.citation}</p>
                    <p className="mt-3 text-xs text-slate-500">Archived {formatDate(entry.archivedAt)}</p>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:px-6">
          <p>Caraga State University · College of Computing and Information Sciences</p>
          <p>Project THRIVE · SRS baseline v1.0</p>
        </div>
      </footer>
    </div>
  );
}
