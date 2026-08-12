'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card, CardHeader, EmptyState } from '@/components/ui';

type Adviser = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  capacity: number;
  activeGroups: number;
  slotsRemaining: number;
};

export function AdviserDirectory({
  advisers,
  thesisId,
  preferredDepartment,
  hasPendingRequest,
}: {
  advisers: Adviser[];
  thesisId: string;
  preferredDepartment: string;
  hasPendingRequest: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [selected, setSelected] = useState<Adviser | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return advisers
      .filter((a) => (onlyAvailable ? a.slotsRemaining > 0 : true))
      .filter((a) => !q || a.name.toLowerCase().includes(q) || (a.department ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        // Same-department advisers first (FR-24 applicable academic criteria).
        const aDept = a.department === preferredDepartment ? 0 : 1;
        const bDept = b.department === preferredDepartment ? 0 : 1;
        if (aDept !== bDept) return aDept - bDept;
        return b.slotsRemaining - a.slotsRemaining;
      });
  }, [advisers, query, onlyAvailable, preferredDepartment]);

  async function sendRequest() {
    if (!selected) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/adviser-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesisId, adviserId: selected.id, message: message.trim() || null }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The request could not be sent.');
        setPending(false);
        return;
      }
      setSelected(null);
      setMessage('');
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please try again shortly.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Available faculty advisers"
          action={
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="rounded border-slate-300 text-csu-600 focus:ring-csu-500"
              />
              Only show advisers with open slots
            </label>
          }
        />
        <div className="border-b border-slate-100 p-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or department"
            className="field-input"
            aria-label="Search advisers"
          />
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 && (
            <EmptyState title="No advisers match your filters" description="Try widening the search or including advisers at full capacity." />
          )}
          {filtered.map((adviser) => (
            <div key={adviser.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{adviser.name}</p>
                  {adviser.department === preferredDepartment && <Badge tone="brand">Your department</Badge>}
                  {adviser.slotsRemaining === 0 && <Badge tone="danger">At capacity</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{adviser.department}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {adviser.activeGroups} of {adviser.capacity} advising slots used
                </p>
              </div>

              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={hasPendingRequest || adviser.slotsRemaining === 0}
                onClick={() => setSelected(adviser)}
                title={
                  hasPendingRequest
                    ? 'You already have a pending request'
                    : adviser.slotsRemaining === 0
                      ? 'This adviser has reached their advising load'
                      : undefined
                }
              >
                Request
              </button>
            </div>
          ))}
        </div>

        {hasPendingRequest && (
          <p className="border-t border-slate-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            You already have a pending adviser request. Wait for a response before sending another.
          </p>
        )}
      </Card>

      {/* Confirmation dialog (SRS 4.3.2 — confirmation for consequential actions) */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => !pending && setSelected(null)}
          />
          <div role="dialog" aria-modal="true" aria-labelledby="request-title" className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="request-title" className="text-lg font-semibold text-slate-900">
              Request {selected.name}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              This sends a request that {selected.name} can accept or decline. You may only have one outstanding
              request at a time.
            </p>

            {error && (
              <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <label htmlFor="request-message" className="field-label mt-4">
              Message (optional)
            </label>
            <textarea
              id="request-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="field-input"
              placeholder="Briefly introduce your study and why you are requesting this adviser."
            />

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setSelected(null)} className="btn-secondary" disabled={pending}>
                Cancel
              </button>
              <button type="button" onClick={sendRequest} className="btn-primary" disabled={pending}>
                {pending ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
