/**
 * Public landing page (SRS Figure 6.1).
 * Static by design — it reads no records, so nothing behind the authentication
 * boundary can leak through it (Appendix 6.1 — Public column). The archive has
 * its own public page for browsing published work.
 */

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui';
import { Logo } from '@/components/logo';
import { Reveal } from '@/components/reveal';

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

/**
 * The enforced stage sequence, mirrored from STAGES in lib/workflow. Hard-coded
 * rather than imported so the landing page stays a pure static render with no
 * dependency on the workflow module (see the file header).
 */
const LIFECYCLE = [
  'Proposal Development',
  'Proposal Defense',
  'Post-Defense Revision',
  'Final Thesis Development',
  'Final Defense',
  'Completion & Archiving',
];

export default function LandingPage() {
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
            <Link href="/login" className="btn-ghost btn-sm whitespace-nowrap">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary btn-sm whitespace-nowrap">
              Sign up
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
          {/* Biased slightly above centre: the artwork ends in a pale wave that
              should stay outside the crop at every hero height. */}
          <Image
            src="/image.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 animate-hero-zoom object-cover object-[center_35%]"
          />
          {/*
            Scrims. The artwork already carries its own green wash, so these stay
            deliberately light — enough to hold white text at 4.5:1 (WCAG 1.4.3)
            without flattening the campus behind it. The horizontal wash does the
            real work under the copy column and thins out to the right, where the
            panel supplies its own backdrop. The short bottom fade only hides the
            pale wave if a tall viewport pulls it into frame, and hands the eye
            over to the white section below.
          */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-csu-900/85 via-csu-900/50 to-csu-900/20"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-csu-900/80 to-transparent"
          />

          {/*
            Two columns from lg up: copy on the left, the stage sequence on the
            right. Below lg the panel drops out and the copy runs single column,
            where there is no empty half to fill.
          */}
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 lg:py-24">
            <div>
              <h1 className="animate-fade-up text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Thesis Hub for Research, Innovation, Validation and Evaluation
              </h1>
              <p className="anim-delay-100 mt-4 max-w-xl animate-fade-up text-pretty text-base text-csu-50 sm:mt-5 sm:text-lg">
                An intelligent academic governance platform that manages the complete undergraduate thesis lifecycle
                at Caraga State University — from registration through defense, approval and institutional archiving.
              </p>
              <div className="anim-delay-200 mt-8 flex animate-fade-up flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/login"
                  className="btn bg-white px-5 py-2.5 font-semibold text-csu-700 shadow-lg shadow-csu-900/20 hover:bg-csu-50 hover:shadow-xl"
                >
                  Sign in to THRIVE
                </Link>
                <Link
                  href="/signup"
                  className="btn border border-white/40 px-5 py-2.5 font-semibold text-white hover:border-white/70 hover:bg-white/10"
                >
                  Create a student account
                </Link>
              </div>
            </div>

            <aside className="anim-delay-300 hidden animate-fade-left rounded-2xl border border-white/20 bg-csu-900/40 p-6 shadow-2xl shadow-csu-900/40 backdrop-blur-md lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-csu-100">
                The enforced sequence
              </p>
              <ol className="mt-5">
                {LIFECYCLE.map((stage, index) => (
                  <li key={stage} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/30"
                      >
                        {index + 1}
                      </span>
                      {index < LIFECYCLE.length - 1 && <span className="w-px flex-1 bg-white/20" />}
                    </div>
                    <p
                      className={`min-w-0 flex-1 text-sm font-medium text-white ${
                        index < LIFECYCLE.length - 1 ? 'pb-5' : ''
                      }`}
                    >
                      {stage}
                    </p>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              What the platform governs
            </h2>
            <p className="mt-3 max-w-2xl text-pretty text-sm text-slate-600 sm:text-base">
              THRIVE replaces fragmented manual coordination with one enforced process, shared by every stakeholder.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {CAPABILITIES.map((item, index) => (
              <Reveal key={item.title} delay={index * 70}>
                <Card className="card-interactive h-full p-6">
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-16">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Ready to begin your thesis?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-slate-600 sm:text-base">
                Register with your Caraga State University email address to open your milestone plan and request a
                faculty adviser.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary px-5 py-2.5">
                  Create a student account
                </Link>
                <Link href="/archive/public" className="btn-secondary px-5 py-2.5">
                  Browse the thesis archive
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 pb-safe-6 text-xs text-slate-500 sm:px-6 sm:text-sm">
          <p>Caraga State University</p>
        </div>
      </footer>
    </div>
  );
}
