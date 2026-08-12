'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function MemberManager({
  thesisId,
  members,
}: {
  thesisId: string;
  members: { id: string; name: string; isLeader: boolean }[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/theses/${thesisId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The member could not be added.');
        return;
      }
      setEmail('');
      router.refresh();
    } catch {
      setError('The system is not reachable right now.');
    } finally {
      setPending(false);
    }
  }

  async function removeMember(userId: string) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/theses/${thesisId}/members?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The member could not be removed.');
        return;
      }
      setRemoving(null);
      router.refresh();
    } catch {
      setError('The system is not reachable right now.');
    } finally {
      setPending(false);
    }
  }

  const removable = members.filter((m) => !m.isLeader);

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <form onSubmit={addMember} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="co.member@carsu.edu.ph"
          className="field-input text-sm"
          aria-label="Add a group member by email"
          required
        />
        <button type="submit" className="btn-primary btn-sm shrink-0" disabled={pending}>
          Add
        </button>
      </form>

      {removable.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {removable.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-slate-600">{member.name}</span>
              {removing === member.id ? (
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => removeMember(member.id)} className="btn-danger btn-sm" disabled={pending}>
                    Confirm
                  </button>
                  <button type="button" onClick={() => setRemoving(null)} className="btn-ghost btn-sm" disabled={pending}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setRemoving(member.id)} className="btn-ghost btn-sm shrink-0 text-rose-600">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
