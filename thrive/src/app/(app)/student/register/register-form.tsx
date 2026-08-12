'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ACADEMIC_PROGRAMS, DEPARTMENTS } from '@/lib/constants';

const CURRENT_AY = (() => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  // Philippine academic year starts in August.
  const start = month >= 7 ? year : year - 1;
  return `${start}-${start + 1}`;
})();

export function RegisterThesisForm({
  defaultProgram,
  defaultDepartment,
}: {
  defaultProgram: string;
  defaultDepartment: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [memberEmails, setMemberEmails] = useState<string[]>(['']);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const data = new FormData(event.currentTarget);
    const body = {
      title: String(data.get('title') ?? '').trim(),
      abstract: String(data.get('abstract') ?? '').trim() || null,
      keywords: String(data.get('keywords') ?? '').trim() || null,
      program: String(data.get('program') ?? ''),
      department: String(data.get('department') ?? ''),
      academicYear: String(data.get('academicYear') ?? ''),
      memberEmails: memberEmails.map((e) => e.trim()).filter(Boolean),
    };

    try {
      const response = await fetch('/api/theses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The project could not be registered.');
        if (payload.details && typeof payload.details === 'object') setFieldErrors(payload.details);
        setPending(false);
        return;
      }

      router.push(`/theses/${payload.data.thesis.id}`);
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please try again shortly.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && (
        <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="title" className="field-label">
          Working thesis title <span className="text-rose-500">*</span>
        </label>
        <input id="title" name="title" required minLength={12} className="field-input" placeholder="A Deep Learning Approach to …" />
        {fieldErrors.title && <p className="field-error">{fieldErrors.title}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="abstract" className="field-label">
          Abstract or problem statement
        </label>
        <textarea id="abstract" name="abstract" rows={5} className="field-input" placeholder="Briefly describe the problem, objectives and intended contribution." />
        {fieldErrors.abstract && <p className="field-error">{fieldErrors.abstract}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="keywords" className="field-label">
          Keywords
        </label>
        <input id="keywords" name="keywords" className="field-input" placeholder="machine learning, agriculture, mobile application" />
        <p className="mt-1 text-xs text-slate-500">Separate keywords with commas. Used for archive search.</p>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="program" className="field-label">
            Degree program <span className="text-rose-500">*</span>
          </label>
          <select id="program" name="program" required defaultValue={defaultProgram} className="field-input">
            <option value="">Select a program</option>
            {ACADEMIC_PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {fieldErrors.program && <p className="field-error">{fieldErrors.program}</p>}
        </div>

        <div>
          <label htmlFor="department" className="field-label">
            Department <span className="text-rose-500">*</span>
          </label>
          <select id="department" name="department" required defaultValue={defaultDepartment} className="field-input">
            <option value="">Select a department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {fieldErrors.department && <p className="field-error">{fieldErrors.department}</p>}
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="academicYear" className="field-label">
          Academic year <span className="text-rose-500">*</span>
        </label>
        <input
          id="academicYear"
          name="academicYear"
          required
          defaultValue={CURRENT_AY}
          pattern="\d{4}-\d{4}"
          className="field-input sm:max-w-[220px]"
        />
        {fieldErrors.academicYear && <p className="field-error">{fieldErrors.academicYear}</p>}
      </div>

      <fieldset className="mb-6 border-t border-slate-100 pt-5">
        <legend className="sr-only">Group members</legend>
        <p className="field-label">Co-members</p>
        <p className="mb-3 text-xs text-slate-500">
          Enter the institutional email of each co-member. You are automatically registered as the group leader. A
          group may have up to five members in total.
        </p>

        {memberEmails.map((email, index) => (
          <div key={index} className="mb-2 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                const next = [...memberEmails];
                next[index] = e.target.value;
                setMemberEmails(next);
              }}
              className="field-input"
              placeholder="co.member@carsu.edu.ph"
              aria-label={`Co-member email ${index + 1}`}
            />
            {memberEmails.length > 1 && (
              <button
                type="button"
                onClick={() => setMemberEmails(memberEmails.filter((_, i) => i !== index))}
                className="btn-secondary btn-sm shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        ))}

        {memberEmails.length < 4 && (
          <button type="button" onClick={() => setMemberEmails([...memberEmails, ''])} className="btn-ghost btn-sm mt-1">
            + Add another member
          </button>
        )}
        {fieldErrors.memberEmails && <p className="field-error">{fieldErrors.memberEmails}</p>}
      </fieldset>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Registering…' : 'Register thesis project'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
