'use client';

/** Inline role/status editing with the confirmation step required by FR-18. */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusPill } from '@/components/ui';
import { ALL_ROLES, ROLE_LABELS, type Role } from '@/lib/constants';

type Account = {
  id: string;
  name: string;
  email: string;
  schoolId: string | null;
  role: string;
  status: string;
  lastLogin: string;
};

export function UserRow({
  account,
  canAssignRole,
  canSetStatus,
  isSelf,
}: {
  account: Account;
  canAssignRole: boolean;
  canSetStatus: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pendingChange, setPendingChange] = useState<{ role?: string; status?: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    if (!pendingChange) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: pendingChange.role,
          status: pendingChange.status,
          confirmed: true,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The change could not be applied.');
        setPendingChange(null);
        setBusy(false);
        return;
      }
      setPendingChange(null);
      router.refresh();
    } catch {
      setError('The system is not reachable right now.');
      setPendingChange(null);
    } finally {
      setBusy(false);
    }
  }

  const showActions = canAssignRole || canSetStatus;
  const nextStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <>
      <tr>
        <td>
          <p className="font-medium text-slate-900">{account.name}</p>
          {isSelf && <span className="text-[11px] text-csu-700">This is you</span>}
        </td>
        <td className="text-xs">{account.email}</td>
        <td className="whitespace-nowrap font-mono text-xs">{account.schoolId ?? '—'}</td>
        <td>
          {canAssignRole && !isSelf ? (
            <select
              value={account.role}
              onChange={(e) =>
                setPendingChange({
                  role: e.target.value,
                  label: `change ${account.name}'s role to ${ROLE_LABELS[e.target.value as Role]}`,
                })
              }
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:border-csu-500 focus:outline-none focus:ring-1 focus:ring-csu-500"
              aria-label={`Role for ${account.name}`}
              disabled={busy}
            >
              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role as Role]}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs">{ROLE_LABELS[account.role as Role] ?? account.role}</span>
          )}
        </td>
        <td>
          <StatusPill status={account.status} />
        </td>
        <td className="whitespace-nowrap text-xs text-slate-500">{account.lastLogin}</td>
        {showActions && (
          <td className="text-right">
            {canSetStatus && !isSelf && (
              <button
                type="button"
                onClick={() =>
                  setPendingChange({
                    status: nextStatus,
                    label:
                      nextStatus === 'INACTIVE'
                        ? `deactivate ${account.name}'s account`
                        : `reactivate ${account.name}'s account`,
                  })
                }
                className={nextStatus === 'INACTIVE' ? 'btn-ghost btn-sm text-rose-600' : 'btn-ghost btn-sm text-csu-700'}
                disabled={busy}
              >
                {nextStatus === 'INACTIVE' ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
            {error && <p className="text-[11px] text-rose-600">{error}</p>}
          </td>
        )}
      </tr>

      {pendingChange && (
        <tr>
          <td colSpan={showActions ? 7 : 6} className="bg-amber-50">
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-2">
              <p className="text-sm text-amber-900">
                Confirm: you are about to <strong>{pendingChange.label}</strong>. This is recorded in the audit trail.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={apply} className="btn-primary btn-sm" disabled={busy}>
                  {busy ? 'Applying…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingChange(null);
                    router.refresh();
                  }}
                  className="btn-secondary btn-sm"
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
