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
import { Icon } from '@/components/icons';
import { Reveal } from '@/components/reveal';
import { INSTITUTIONAL_EMAIL_DOMAIN } from '@/lib/constants';

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
              Log In
            </Link>
            <Link
              href="/signup"
              className="btn-primary btn-sm whitespace-nowrap hover:-translate-y-px"
            >
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
        <section className="relative isolate flex min-h-hero items-center overflow-hidden bg-gradient-to-br from-csu-800 via-csu-700 to-csu-600 text-white">
          {/* Decorative, so the alt text is empty; `priority` keeps it out of the
              lazy queue since it is the largest paint on the page. */}
          {/*
            The artwork ends in a decorative white/gold wave banner occupying its
            bottom 8.8% (rows 836-917 of 917), which must never reach the screen.
            `object-cover` alone cannot guarantee that: once the hero is taller
            than the viewport is wide relative to the image aspect — a portrait
            tablet, a tall desktop window — cover fits by height and reveals the
            full image, wave included. So the photo is given a box 12% taller
            than the hero and anchored to the top; the section's `overflow-hidden`
            clips the surplus. Whichever axis cover ends up fitting, the bottom
            10.7% of the frame is always cut, which comfortably swallows the wave.
          */}
          <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[112%]">
            <Image
              src="/image.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="animate-hero-zoom object-cover object-[center_35%]"
            />
          </div>
          {/*
            Scrims. The artwork already carries its own green wash, so these stay
            deliberately light — the campus has to stay legible as a photograph,
            not read as a flat green panel. The horizontal wash is held back to
            /60 under the copy and thins to almost nothing on the right, where
            the glass panel supplies its own backdrop. Sampling every pixel the
            copy sits on puts the worst case at 6.5:1 for the headline and 6.7:1
            for the paragraph, so this clears WCAG 1.4.3 (4.5:1) with room to
            spare — the artwork carries its own baked-in green wash, which does
            most of the work. The short bottom fade only hides the pale wave if
            a tall viewport pulls it into frame, and hands the eye to the white
            section below.
          */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-csu-900/60 via-csu-900/25 to-csu-900/5"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-csu-900/60 to-transparent"
          />

          {/*
            Two columns from lg up: copy on the left, the stage sequence on the
            right. Below lg the panel drops out and the copy runs single column,
            where there is no empty half to fill.
          */}
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 lg:py-24">
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
                  className="btn group bg-white px-5 py-2.5 font-semibold text-csu-700 shadow-lg shadow-csu-900/20 hover:-translate-y-0.5 hover:bg-csu-50 hover:shadow-xl"
                >
                  Log In to THRIVE
                  <span aria-hidden className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <Link
                  href="/signup"
                  className="btn group border border-white/40 px-5 py-2.5 font-semibold text-white hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/10"
                >
                  Create a student account
                  <span aria-hidden className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/*
              Glass, not paint: the panel is held at /25 so the building stays
              readable straight through it. Each row is its own hover group, so
              pointing at a stage lifts the marker and slides the label — no
              client component needed, it is all CSS.
            */}
            <aside className="anim-delay-300 hidden animate-fade-left rounded-2xl border border-white/25 bg-csu-900/25 p-6 shadow-2xl shadow-csu-900/40 backdrop-blur-md transition duration-500 hover:border-white/40 hover:bg-csu-900/35 lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-csu-100">
                The enforced sequence
              </p>
              <ol className="mt-5">
                {LIFECYCLE.map((stage, index) => (
                  <li key={stage} className="group flex cursor-default gap-3.5">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/30 transition duration-300 ease-out group-hover:scale-125 group-hover:bg-csu-500 group-hover:shadow-lg group-hover:shadow-csu-900/50 group-hover:ring-white/70"
                      >
                        {index + 1}
                      </span>
                      {index < LIFECYCLE.length - 1 && (
                        <span className="w-px flex-1 bg-white/20 transition-colors duration-300 group-hover:bg-white/50" />
                      )}
                    </div>
                    <p
                      className={`min-w-0 flex-1 text-sm font-medium text-csu-50 transition duration-300 ease-out group-hover:translate-x-1.5 group-hover:text-white ${
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
                {/* The accent rule wipes in from the left on hover, so the card
                    the pointer is over is unambiguous in a six-card grid. */}
                <Card className="card-interactive group relative h-full overflow-hidden p-6">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-csu-600 to-csu-300 transition-transform duration-500 ease-out group-hover:scale-x-100"
                  />
                  <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 group-hover:text-csu-700">
                    {item.title}
                  </h3>
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
                <Link
                  href="/signup"
                  className="btn-primary group px-5 py-2.5 hover:-translate-y-0.5"
                >
                  Create a student account
                  <span aria-hidden className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <Link
                  href="/archive/public"
                  className="btn-secondary group px-5 py-2.5 hover:-translate-y-0.5 hover:shadow-md"
                >
                  Browse the thesis archive
                  <span aria-hidden className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/*
        Institutional footer bar, matching the MySchool masthead: deep green
        field, gold rule, lockup left and the university link right. The gold
        sits on top here because the bar closes the page rather than opening it.
      */}
      <footer className="border-t-4 border-gold-500 bg-csu-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <Logo inverted />
            <a
              href={`https://www.${INSTITUTIONAL_EMAIL_DOMAIN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 self-start text-sm font-semibold text-white transition-colors duration-200 hover:text-gold-400 sm:self-auto"
            >
              <Icon
                name="globe"
                className="h-5 w-5 transition-transform duration-500 ease-out group-hover:rotate-[25deg]"
              />
              <span className="link-underline">University Website</span>
            </a>
          </div>

          <div className="mt-6 border-t border-white/15 pt-4 pb-safe-6 text-xs text-csu-100">
            <p>Caraga State University — Thesis Governance Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
