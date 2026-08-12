'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Badge, EmptyState, relativeTime, type Tone } from '@/components/ui';

type Item = {
  id: string;
  category: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const CATEGORY_TONE: Record<string, Tone> = {
  SUBMISSION: 'info',
  EVALUATION: 'warning',
  ADVISER: 'brand',
  SCHEDULE: 'info',
  WORKFLOW: 'success',
  ACCOUNT: 'neutral',
};

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'SUBMISSION', label: 'Submissions' },
  { key: 'EVALUATION', label: 'Evaluations' },
  { key: 'SCHEDULE', label: 'Schedules' },
];

export function NotificationList({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);

  const unread = items.filter((i) => !i.read).length;

  const visible = items.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !item.read;
    return item.category === filter;
  });

  async function markOne(id: string) {
    setItems((current) => current.map((i) => (i.id === id ? { ...i, read: true } : i)));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function markAll() {
    setBusy(true);
    setItems((current) => current.map((i) => ({ ...i, read: true })));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={clsx(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                filter === option.key ? 'bg-csu-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {option.label}
              {option.key === 'UNREAD' && unread > 0 && ` (${unread})`}
            </button>
          ))}
        </div>

        {unread > 0 && (
          <button type="button" onClick={markAll} className="btn-secondary btn-sm" disabled={busy}>
            {busy ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {visible.length === 0 && (
          <EmptyState
            title={filter === 'UNREAD' ? 'No unread notifications' : 'No notifications'}
            description="Notifications appear here when documents are submitted, evaluated, or when schedules change."
          />
        )}

        {visible.map((item) => {
          const content = (
            <>
              <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.read ? 'bg-slate-200' : 'bg-csu-600')} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={clsx('text-sm', item.read ? 'text-slate-700' : 'font-semibold text-slate-900')}>
                    {item.title}
                  </p>
                  <Badge tone={CATEGORY_TONE[item.category] ?? 'neutral'}>{item.category.toLowerCase()}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>
                <p className="mt-1 text-xs text-slate-400">{relativeTime(item.createdAt)}</p>
              </div>
            </>
          );

          return (
            <div key={item.id} className={clsx('flex gap-3 p-4', !item.read && 'bg-csu-50/40')}>
              {item.link ? (
                <Link href={item.link} onClick={() => !item.read && markOne(item.id)} className="flex flex-1 gap-3">
                  {content}
                </Link>
              ) : (
                <div className="flex flex-1 gap-3">{content}</div>
              )}

              {!item.read && (
                <button type="button" onClick={() => markOne(item.id)} className="btn-ghost btn-sm shrink-0 self-start">
                  Mark read
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
