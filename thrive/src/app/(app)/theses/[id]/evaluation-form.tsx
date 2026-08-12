'use client';

/** Adviser / panel evaluation entry (FR-36, FR-37) with a confirmation step. */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const DECISIONS = [
  { value: 'APPROVED', label: 'Approve', hint: 'Requirement is met and the milestone may proceed.' },
  { value: 'REVISE', label: 'Return for revision', hint: 'Students must resubmit an improved version.' },
  { value: 'REJECTED', label: 'Reject', hint: 'Submission is not acceptable in its current direction.' },
];

export function EvaluationForm({ documentId, documentTitle }: { documentId: string; documentTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState('APPROVED');
  const [comments, setComments] = useState('');
  const [score, setScore] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary btn-sm">
        Record evaluation
      </button>
    );
  }

  function requestConfirmation(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (comments.trim().length < 10) {
      setError('Provide remarks of at least 10 characters so the students know what to act on.');
      return;
    }
    setConfirming(true);
  }

  async function submit() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          comments: comments.trim(),
          score: score ? Number(score) : null,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The evaluation could not be recorded.');
        setConfirming(false);
        setPending(false);
        return;
      }

      setOpen(false);
      setConfirming(false);
      setComments('');
      setScore('');
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please try again shortly.');
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  const decisionLabel = DECISIONS.find((d) => d.value === decision)?.label ?? decision;

  return (
    <form onSubmit={requestConfirmation} className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evaluate {documentTitle}</p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <fieldset className="mt-3">
        <legend className="field-label">Decision</legend>
        <div className="space-y-1.5">
          {DECISIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-white p-2.5 ring-1 ring-slate-200 has-[:checked]:ring-2 has-[:checked]:ring-csu-500">
              <input
                type="radio"
                name={`decision-${documentId}`}
                value={option.value}
                checked={decision === option.value}
                onChange={(e) => setDecision(e.target.value)}
                className="mt-0.5 text-csu-600 focus:ring-csu-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3">
        <label htmlFor={`comments-${documentId}`} className="field-label">
          Remarks <span className="text-rose-500">*</span>
        </label>
        <textarea
          id={`comments-${documentId}`}
          rows={4}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="field-input"
          placeholder="Be specific about what must change and where — the students see these remarks verbatim."
        />
      </div>

      <div className="mt-3">
        <label htmlFor={`score-${documentId}`} className="field-label">
          Score (optional, 0–100)
        </label>
        <input
          id={`score-${documentId}`}
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="field-input max-w-[140px]"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={pending}>
          Review and submit
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary btn-sm" disabled={pending}>
          Cancel
        </button>
      </div>

      {/* SRS 4.3.2 — confirmation dialog for a high-impact action */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirming(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Confirm evaluation</h2>
            <p className="mt-2 text-sm text-slate-600">
              You are about to record <strong>{decisionLabel.toLowerCase()}</strong> for {documentTitle}. The students
              will be notified immediately and this decision becomes part of the permanent evaluation record.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="btn-secondary" disabled={pending}>
                Go back
              </button>
              <button type="button" onClick={submit} className="btn-primary" disabled={pending}>
                {pending ? 'Recording…' : `Confirm ${decisionLabel.toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
