'use client';

/**
 * Milestone advancement and archiving.
 * The gate reasons are shown up front so the blocking condition is visible
 * before the user tries the action (FR-40, FR-45).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui';
import { Icon } from '@/components/icons';

type Gate = { canApprove: boolean; missing: string[] };

export function WorkflowActions({
  thesisId,
  stageLabel,
  canAdvance,
  gate,
  showArchive = false,
}: {
  thesisId: string;
  stageLabel: string;
  canAdvance: boolean;
  gate: Gate;
  showArchive?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<'advance' | 'archive' | null>(null);
  const [visibility, setVisibility] = useState('INSTITUTIONAL');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  async function advance() {
    setPending(true);
    setError(null);
    setBlockers([]);

    try {
      const response = await fetch(`/api/theses/${thesisId}/advance`, { method: 'POST' });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The milestone could not be approved.');
        if (Array.isArray(payload.details?.missing)) setBlockers(payload.details.missing);
        setConfirming(null);
        setPending(false);
        return;
      }

      setSuccess(payload.data.message);
      setConfirming(null);
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please try again shortly.');
      setConfirming(null);
    } finally {
      setPending(false);
    }
  }

  async function archive() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/theses/${thesisId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The thesis could not be archived.');
        setConfirming(null);
        setPending(false);
        return;
      }

      setSuccess(payload.data.message);
      setConfirming(null);
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please try again shortly.');
      setConfirming(null);
    } finally {
      setPending(false);
    }
  }

  const outstanding = blockers.length ? blockers : gate.missing;

  return (
    <>
      <Card>
        <CardHeader title="Workflow actions" />
        <div className="p-5">
          {success && (
            <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          )}
          {error && (
            <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {canAdvance && (
            <>
              {outstanding.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-2">
                    <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        {stageLabel} cannot be approved yet
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-800">
                        {outstanding.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-800">
                    All requirements for {stageLabel} are satisfied. Approving moves the project to the next stage.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setConfirming('advance')}
                className="btn-primary mt-4 w-full"
                disabled={outstanding.length > 0 || pending}
              >
                <Icon name="check" className="h-4 w-4" />
                Approve {stageLabel}
              </button>
            </>
          )}

          {showArchive && (
            <>
              <label htmlFor="visibility" className="field-label mt-4">
                Archive visibility
              </label>
              <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)} className="field-input">
                <option value="INSTITUTIONAL">Institutional — signed-in users only</option>
                <option value="PUBLIC">Public — listed on the public archive</option>
                <option value="RESTRICTED">Restricted — coordinators and administrators only</option>
              </select>
              <button type="button" onClick={() => setConfirming('archive')} className="btn-secondary mt-3 w-full" disabled={pending}>
                <Icon name="archive" className="h-4 w-4" />
                Archive this thesis
              </button>
            </>
          )}
        </div>
      </Card>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-900/40" onClick={() => !pending && setConfirming(null)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              {confirming === 'advance' ? `Approve ${stageLabel}?` : 'Archive this thesis?'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {confirming === 'advance'
                ? 'This closes the current milestone, opens the next stage, and notifies the group, adviser and panel. The approval is recorded in the audit trail.'
                : `The thesis becomes a permanent institutional record with ${visibility.toLowerCase()} visibility. Archived records are read-only.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(null)} className="btn-secondary" disabled={pending}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirming === 'advance' ? advance : archive}
                className="btn-primary"
                disabled={pending}
              >
                {pending ? 'Working…' : confirming === 'advance' ? 'Approve milestone' : 'Archive thesis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
