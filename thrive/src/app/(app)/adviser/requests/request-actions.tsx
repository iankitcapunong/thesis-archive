'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RequestActions({ requestId, disabled }: { requestId: string; disabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [response, setResponse] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: 'ACCEPTED' | 'REJECTED') {
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/adviser-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, response: response.trim() || null }),
      });
      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        setError(payload.error ?? 'The response could not be recorded.');
        setPending(false);
        return;
      }
      setMode(null);
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please try again shortly.');
    } finally {
      setPending(false);
    }
  }

  if (mode) {
    return (
      <div className="rounded-lg bg-slate-50 p-4">
        {error && (
          <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
        <p className="text-sm font-medium text-slate-800">
          {mode === 'ACCEPTED' ? 'Accept this group?' : 'Decline this request?'}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {mode === 'ACCEPTED'
            ? 'You become the assigned adviser and the group’s other pending requests are withdrawn.'
            : 'The group is notified and may request a different adviser.'}
        </p>

        <label htmlFor={`response-${requestId}`} className="field-label mt-3">
          Message to the group {mode === 'REJECTED' && <span className="font-normal text-slate-500">(recommended)</span>}
        </label>
        <textarea
          id={`response-${requestId}`}
          rows={3}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="field-input"
          placeholder={mode === 'ACCEPTED' ? 'Consultation schedule, first expectations…' : 'Reason, or a suggested alternative adviser…'}
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => submit(mode)}
            className={mode === 'ACCEPTED' ? 'btn-primary btn-sm' : 'btn-danger btn-sm'}
            disabled={pending}
          >
            {pending ? 'Saving…' : mode === 'ACCEPTED' ? 'Confirm acceptance' : 'Confirm decline'}
          </button>
          <button type="button" onClick={() => setMode(null)} className="btn-secondary btn-sm" disabled={pending}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setMode('ACCEPTED')}
        className="btn-primary btn-sm"
        disabled={disabled}
        title={disabled ? 'You have reached your advising load' : undefined}
      >
        Accept
      </button>
      <button type="button" onClick={() => setMode('REJECTED')} className="btn-secondary btn-sm">
        Decline
      </button>
      {error && <p className="w-full text-xs text-rose-600">{error}</p>}
    </div>
  );
}
