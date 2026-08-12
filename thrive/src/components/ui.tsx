/**
 * Shared presentational primitives.
 * Status vocabulary follows SRS 3.3.1 (Pending / Approved / Revise / Completed
 * / Rejected) so the same visual language appears on every screen.
 */

import Link from 'next/link';
import clsx from 'clsx';
import type { ReactNode } from 'react';

const TONES = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  brand: 'bg-csu-50 text-csu-700 ring-csu-200',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  // documents
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REVISE: 'warning',
  REJECTED: 'danger',
  // milestones
  LOCKED: 'neutral',
  IN_PROGRESS: 'info',
  SUBMITTED: 'info',
  // thesis
  DRAFT: 'neutral',
  ACTIVE: 'brand',
  COMPLETED: 'success',
  ARCHIVED: 'neutral',
  WITHDRAWN: 'danger',
  // requests & schedules
  ACCEPTED: 'success',
  CANCELLED: 'neutral',
  SCHEDULED: 'info',
  RESCHEDULED: 'warning',
  // accounts
  INACTIVE: 'danger',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} className={className}>
      {humanize(status)}
    </Badge>
  );
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('card', className)}>{children}</section>;
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="card-header">
      <h2 className="card-title">{title}</h2>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'brand',
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <div className="card h-full p-5 transition hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {hint && (
        <p className="mt-2">
          <Badge tone={tone}>{hint}</Badge>
        </p>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
        <span>{label ?? 'Overall progress'}</span>
        <span className="font-semibold text-slate-800">{clamped}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Overall progress'}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-csu-500 to-csu-700 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function relativeTime(value: Date | string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}
