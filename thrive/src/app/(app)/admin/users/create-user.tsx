'use client';

/** Administrator-created accounts with role assignment (FR-06, FR-07). */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui';
import { ALL_ROLES, ROLE_LABELS, ACADEMIC_PROGRAMS, DEPARTMENTS, ROLES, type Role } from '@/lib/constants';

export function CreateUserPanel({ actorRole, defaultDepartment }: { actorRole: string; defaultDepartment: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [role, setRole] = useState<string>(ROLES.STUDENT);

  // A coordinator may only onboard students and faculty (privilege guard
  // mirrored server-side in POST /api/users).
  const assignableRoles =
    actorRole === ROLES.ADMIN ? ALL_ROLES : [ROLES.STUDENT, ROLES.FACULTY_ADVISER, ROLES.PANEL_MEMBER];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: String(data.get('firstName') ?? '').trim(),
          lastName: String(data.get('lastName') ?? '').trim(),
          email: String(data.get('email') ?? '').trim(),
          role,
          password: String(data.get('password') ?? ''),
          schoolId: String(data.get('schoolId') ?? '') || null,
          program: String(data.get('program') ?? '') || null,
          department: String(data.get('department') ?? '') || null,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The account could not be created.');
        if (payload.details && typeof payload.details === 'object') setFieldErrors(payload.details);
        setPending(false);
        return;
      }

      setSuccess(payload.data.message);
      form.reset();
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please try again shortly.');
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        + Create a user account
      </button>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Create a user account"
        action={
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">
            Close
          </button>
        }
      />
      <form onSubmit={onSubmit} className="p-5" noValidate>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="field-label">
              First name <span className="text-rose-500">*</span>
            </label>
            <input id="firstName" name="firstName" required className="field-input" />
            {fieldErrors.firstName && <p className="field-error">{fieldErrors.firstName}</p>}
          </div>
          <div>
            <label htmlFor="lastName" className="field-label">
              Last name <span className="text-rose-500">*</span>
            </label>
            <input id="lastName" name="lastName" required className="field-input" />
            {fieldErrors.lastName && <p className="field-error">{fieldErrors.lastName}</p>}
          </div>
          <div>
            <label htmlFor="email" className="field-label">
              Institutional email <span className="text-rose-500">*</span>
            </label>
            <input id="email" name="email" type="email" required className="field-input" placeholder="name@carsu.edu.ph" />
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="role" className="field-label">
              Role <span className="text-rose-500">*</span>
            </label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="field-input">
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r as Role]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="schoolId" className="field-label">
              {role === ROLES.STUDENT ? 'Student number' : 'Employee number'}
            </label>
            <input id="schoolId" name="schoolId" className="field-input" />
          </div>
          <div>
            <label htmlFor="department" className="field-label">
              Department
            </label>
            <select id="department" name="department" defaultValue={defaultDepartment} className="field-input">
              <option value="">Not specified</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          {role === ROLES.STUDENT && (
            <div>
              <label htmlFor="program" className="field-label">
                Degree program
              </label>
              <select id="program" name="program" className="field-input">
                <option value="">Not specified</option>
                {ACADEMIC_PROGRAMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="password" className="field-label">
              Temporary password <span className="text-rose-500">*</span>
            </label>
            <input id="password" name="password" type="text" required minLength={10} className="field-input" />
            <p className="mt-1 text-xs text-slate-500">
              Minimum 10 characters. The account holder should change it via account recovery on first use.
            </p>
            {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
          </div>
        </div>

        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-5">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'Creating…' : 'Create account'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-secondary" disabled={pending}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
