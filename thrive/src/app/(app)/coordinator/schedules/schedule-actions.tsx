'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ScheduleActions({ scheduleId }: { scheduleId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<'COMPLETED' | 'CANCELLED' | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(status: 'COMPLETED' | 'CANCELLED') {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/defenses/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The schedule could not be updated.');
        setConfirming(null);
        setPending(false);
        return;
      }
      setConfirming(null);
      router.refresh();
    } catch {
      setError('The system is not reachable right now.');
      setConfirming(null);
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <div className="rounded-lg bg-slate-50 p-3">
        <p className="text-sm text-slate-700">
          {confirming === 'COMPLETED'
            ? 'Mark this defense as completed? This unlocks milestone approval for the group.'
            : 'Cancel this defense? All participants will be notified.'}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => update(confirming)}
            className={confirming === 'COMPLETED' ? 'btn-primary btn-sm' : 'btn-danger btn-sm'}
            disabled={pending}
          >
            {pending ? 'Saving…' : 'Confirm'}
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="btn-secondary btn-sm" disabled={pending}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setConfirming('COMPLETED')} className="btn-primary btn-sm">
        Mark completed
      </button>
      <button type="button" onClick={() => setConfirming('CANCELLED')} className="btn-secondary btn-sm">
        Cancel defense
      </button>
      {error && <p className="w-full text-xs text-rose-600">{error}</p>}
    </div>
  );
}
