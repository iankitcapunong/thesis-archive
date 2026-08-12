'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui';

type Faculty = { id: string; name: string; department: string | null; assignments: number };

export function PanelAssigner({
  thesisId,
  adviserId,
  faculty,
  current,
}: {
  thesisId: string;
  adviserId: string | null;
  faculty: Faculty[];
  current: { id: string; isChair: boolean }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(current.map((c) => c.id));
  const [chairId, setChairId] = useState(current.find((c) => c.isChair)?.id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = faculty.filter((f) => f.id !== adviserId);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 5 ? [...s, id] : s));
  }

  async function save() {
    if (selected.length === 0) {
      setError('Select at least one panel member.');
      return;
    }
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/theses/${thesisId}/panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelistIds: selected, chairId: chairId || null }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The panel could not be updated.');
        setPending(false);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError('The system is not reachable right now.');
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {current.length === 0 ? (
          <Badge tone="warning">No panel assigned</Badge>
        ) : (
          current.map((member) => {
            const person = faculty.find((f) => f.id === member.id);
            return (
              <Badge key={member.id} tone={member.isChair ? 'info' : 'neutral'}>
                {person?.name ?? 'Unknown'}
                {member.isChair && ' · Chair'}
              </Badge>
            );
          })
        )}
        <button type="button" onClick={() => setEditing(true)} className="btn-secondary btn-sm ml-auto">
          {current.length === 0 ? 'Assign panel' : 'Edit panel'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <p className="field-label">Select panel members (maximum 5)</p>
      <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
        {eligible.map((f) => (
          <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selected.includes(f.id)}
              onChange={() => toggle(f.id)}
              className="rounded border-slate-300 text-csu-600 focus:ring-csu-500"
            />
            <span className="min-w-0 flex-1 truncate text-slate-700">{f.name}</span>
            <span className="shrink-0 text-[11px] text-slate-400">{f.assignments} assigned</span>
          </label>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="mt-3">
          <label htmlFor={`chair-${thesisId}`} className="field-label">
            Panel chair
          </label>
          <select id={`chair-${thesisId}`} value={chairId} onChange={(e) => setChairId(e.target.value)} className="field-input">
            <option value="">No designated chair</option>
            {selected.map((id) => (
              <option key={id} value={id}>
                {faculty.find((f) => f.id === id)?.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={save} className="btn-primary btn-sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save panel'}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setSelected(current.map((c) => c.id));
            setError(null);
          }}
          className="btn-secondary btn-sm"
          disabled={pending}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
