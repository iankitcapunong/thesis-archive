/**
 * Public landing page (SRS Figure 6.1).
 * Publicly visible archive entries are surfaced here; everything else requires
 * authentication (Appendix 6.1 — Public column).
 */

import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { Badge, Card, formatDate } from '@/components/ui';
import { Logo } from '@/components/logo';
import { Reveal } from '@/components/reveal';
import { CountUp } from '@/components/count-up';

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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Logo compact />
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/archive/public" className="btn-ghost btn-sm whitespace-nowrap">
              <span className="xs:hidden">Archive</span>
              <span className="hidden xs:inline">Thesis archive</span>
            </Link>
            <Link href="/login" className="btn-primary btn-sm whitespace-nowrap">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/*
          Hero. The section's own gradient is the base layer, so if the campus
          photograph is ever missing the panel still reads as intended rather
          than collapsing to bare text.
        */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-csu-800 via-csu-700 to-csu-600 text-white">
          {/* Decorative, so the alt text is empty; `priority` keeps it out of the
              lazy queue since it is the largest paint on the page. */}
          <Image
            src="/image.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 animate-hero-zoom object-cover object-center"
          />
          {/*
            Scrims. The banner already carries its own green wash, so these stay
            light — just enough to hold white text at 4.5:1 (WCAG 1.4.3). The
            second one guards the stat row, which can otherwise land on the pale
            wave at the foot of the artwork once the image is cropped to fit.
          */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-csu-900/75 via-csu-900/45 to-csu-900/20"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-csu-900/85 via-csu-900/30 to-transparent"
          />

          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
            <div className="animate-fade-up">
              <Badge tone="neutral" className="bg-white/15 text-white ring-white/25">
                College of Computing and Information Sciences · Pilot Implementation
              </Badge>
            </div>
            <h1 className="anim-delay-100 mt-5 max-w-3xl animate-fade-up text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Thesis Hub for Research, Innovation, Validation and Evaluation
            </h1>
            <p className="anim-delay-200 mt-4 max-w-2xl animate-fade-up text-base text-csu-50 sm:mt-5 sm:text-lg">
              An intelligent academic governance platform that manages the complete undergraduate thesis lifecycle
              at Caraga State University — from registration through defense, approval and institutional archiving.
            </p>
            <div className="anim-delay-300 mt-8 flex animate-fade-up flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/login"
                className="btn bg-white px-5 py-2.5 font-semibold text-csu-700 shadow-lg shadow-csu-900/20 hover:bg-csu-50 hover:shadow-xl"
              >
                Sign in to THRIVE
              </Link>
              <Link
                href="/archive/public"
                className="btn border border-white/40 px-5 py-2.5 font-semibold text-white hover:border-white/70 hover:bg-white/10"
              >
                Browse published theses
              </Link>
            </div>

            {/* Animated as one block so it lands after the headline cascade;
                a nested stagger would run under the parent's own fade. */}
            <dl className="anim-delay-500 mt-12 grid max-w-2xl animate-fade-up grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-6">
              {[
                ['Active thesis projects', activeTheses],
                ['Faculty advisers', advisers],
                ['Archived manuscripts', archived],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15 transition duration-300 hover:bg-white/15 hover:ring-white/30"
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-csu-100">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold sm:text-3xl">
                    <CountUp value={value as number} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <Reveal>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">What the platform governs</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              THRIVE replaces fragmented manual coordination with one enforced process, shared by every stakeholder.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {CAPABILITIES.map((item, index) => (
              <Reveal key={item.title} delay={index * 70}>
                <Card className="card-interactive h-full p-5">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {published.length > 0 && (
          <section className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
              <Reveal className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Recently published research</h2>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    Completed undergraduate theses released for public reference.
                  </p>
                </div>
                <Link href="/archive/public" className="btn-secondary btn-sm">
                  View full archive
                </Link>
              </Reveal>
              <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-2">
                {published.map((entry, index) => (
                  <Reveal key={entry.id} delay={index * 70}>
                    <Card className="card-interactive h-full p-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-csu-700">
                        {entry.thesis.program} · AY {entry.thesis.academicYear}
                      </p>
                      <h3 className="mt-2 font-semibold leading-snug text-slate-900">{entry.thesis.title}</h3>
                      <p className="mt-3 text-sm text-slate-600">{entry.citation}</p>
                      <p className="mt-3 text-xs text-slate-500">Archived {formatDate(entry.archivedAt)}</p>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 pb-safe-6 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 sm:text-sm">
          <p>Caraga State University · College of Computing and Information Sciences</p>
          <p>Project THRIVE · SRS baseline v1.0</p>
        </div>
      </footer>
    </div>
  );
}
