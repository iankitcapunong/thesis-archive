'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type ThesisOption = { id: string; label: string; currentStage: string; adviserId: string | null };
type FacultyOption = { id: string; name: string; department: string | null; role: string };

export function ScheduleForm({ theses, faculty }: { theses: ThesisOption[]; faculty: FacultyOption[] }) {
  const router = useRouter();
  const [thesisId, setThesisId] = useState('');
  const [defenseType, setDefenseType] = useState('PROPOSAL');
  const [panelistIds, setPanelistIds] = useState<string[]>([]);
  const [chairId, setChairId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedThesis = theses.find((t) => t.id === thesisId);
  // The adviser must not evaluate their own advisees on the panel.
  const eligiblePanelists = faculty.filter((f) => f.id !== selectedThesis?.adviserId);

  function togglePanelist(id: string) {
    setPanelistIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : current.length < 5 ? [...current, id] : current,
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (panelistIds.length === 0) {
      setError('Select at least one panel member.');
      return;
    }

    const data = new FormData(event.currentTarget);
    const localDateTime = String(data.get('scheduledAt') ?? '');
    if (!localDateTime) {
      setError('Choose the defense date and time.');
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/defenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thesisId,
          defenseType,
          // datetime-local has no timezone; interpret it in the browser's zone.
          scheduledAt: new Date(localDateTime).toISOString(),
          durationMin: Number(data.get('durationMin') ?? 90),
          venue: String(data.get('venue') ?? ''),
          panelistIds,
          chairId: chairId || null,
          remarks: String(data.get('remarks') ?? '') || null,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The defense could not be scheduled.');
        setPending(false);
        return;
      }

      setSuccess(payload.data.message);
      setThesisId('');
      setPanelistIds([]);
      setChairId('');
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please try again shortly.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <div className="mb-4">
        <label htmlFor="thesisId" className="field-label">
          Thesis project <span className="text-rose-500">*</span>
        </label>
        <select
          id="thesisId"
          required
          value={thesisId}
          onChange={(e) => {
            setThesisId(e.target.value);
            setPanelistIds([]);
            setChairId('');
          }}
          className="field-input"
        >
          <option value="">Select a thesis group</option>
          {theses.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label.length > 70 ? `${t.label.slice(0, 70)}…` : t.label}
            </option>
          ))}
        </select>
        {theses.length === 0 && (
          <p className="mt-1 text-xs text-amber-700">
            No active project has an assigned adviser yet. A defense can only be scheduled after adviser assignment.
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="defenseType" className="field-label">
          Defense type <span className="text-rose-500">*</span>
        </label>
        <select id="defenseType" value={defenseType} onChange={(e) => setDefenseType(e.target.value)} className="field-input">
          <option value="PROPOSAL">Proposal defense</option>
          <option value="FINAL">Final defense</option>
        </select>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="scheduledAt" className="field-label">
            Date and time <span className="text-rose-500">*</span>
          </label>
          <input id="scheduledAt" name="scheduledAt" type="datetime-local" required className="field-input" />
        </div>
        <div>
          <label htmlFor="durationMin" className="field-label">
            Duration (minutes)
          </label>
          <input id="durationMin" name="durationMin" type="number" min={30} max={300} step={15} defaultValue={90} className="field-input" />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="venue" className="field-label">
          Venue <span className="text-rose-500">*</span>
        </label>
        <input id="venue" name="venue" required className="field-input" placeholder="CCIS Audio-Visual Room" />
      </div>

      <fieldset className="mb-4">
        <legend className="field-label">
          Panel members <span className="text-rose-500">*</span>
        </legend>
        <p className="mb-2 text-xs text-slate-500">Select up to five. The assigned adviser is excluded automatically.</p>
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {eligiblePanelists.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                checked={panelistIds.includes(f.id)}
                onChange={() => togglePanelist(f.id)}
                className="rounded border-slate-300 text-csu-600 focus:ring-csu-500"
              />
              <span className="min-w-0 flex-1 truncate text-slate-700">{f.name}</span>
              <span className="shrink-0 text-[11px] text-slate-400">{f.role === 'PANEL_MEMBER' ? 'Panel' : 'Faculty'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {panelistIds.length > 0 && (
        <div className="mb-4">
          <label htmlFor="chairId" className="field-label">
            Panel chair
          </label>
          <select id="chairId" value={chairId} onChange={(e) => setChairId(e.target.value)} className="field-input">
            <option value="">No designated chair</option>
            {panelistIds.map((id) => (
              <option key={id} value={id}>
                {faculty.find((f) => f.id === id)?.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-5">
        <label htmlFor="remarks" className="field-label">
          Remarks
        </label>
        <textarea id="remarks" name="remarks" rows={2} className="field-input" placeholder="Preparation notes for the group or panel." />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={pending || !thesisId}>
        {pending ? 'Scheduling…' : 'Schedule defense'}
      </button>
    </form>
  );
}
