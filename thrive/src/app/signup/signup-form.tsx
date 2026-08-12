'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import {
  PROGRAMS_BY_COLLEGE,
  PROGRAM_OTHER,
  INSTITUTIONAL_EMAIL_DOMAIN,
  isInstitutionalEmail,
} from '@/lib/constants';

type FieldErrors = Record<string, string>;

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    schoolId: '',
    program: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Shown as guidance while typing; the server rule is what actually decides.
  const emailLooksWrong = form.email.includes('@') && !isInstitutionalEmail(form.email);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        if (payload.details && typeof payload.details === 'object') {
          setFieldErrors(payload.details as FieldErrors);
        }
        setError(payload.error ?? 'Your account could not be created. Please try again.');
        setPending(false);
        return;
      }

      router.push(payload.data.redirectTo);
      router.refresh();
    } catch {
      setError('The system is not reachable right now. Please check your connection and try again.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && (
        <div
          role="alert"
          className="mb-4 animate-fade-down rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="firstName"
          label="First name"
          value={form.firstName}
          onChange={set('firstName')}
          error={fieldErrors.firstName}
          autoComplete="given-name"
          required
        />
        <Field
          id="lastName"
          label="Last name"
          value={form.lastName}
          onChange={set('lastName')}
          error={fieldErrors.lastName}
          autoComplete="family-name"
          required
        />
      </div>

      <div className="mt-4">
        <Field
          id="email"
          label="Institutional email"
          type="email"
          value={form.email}
          onChange={set('email')}
          error={fieldErrors.email ?? (emailLooksWrong ? `Use your @${INSTITUTIONAL_EMAIL_DOMAIN} address.` : undefined)}
          autoComplete="username"
          placeholder={`juan.delacruz@${INSTITUTIONAL_EMAIL_DOMAIN}`}
          hint={`Your university address, including a Caraga State University Google account. Must end in @${INSTITUTIONAL_EMAIL_DOMAIN}.`}
          required
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          id="schoolId"
          label="Student number"
          value={form.schoolId}
          onChange={set('schoolId')}
          error={fieldErrors.schoolId}
          optional
        />
        <div>
          <label htmlFor="program" className="field-label">
            Degree program <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <select
            id="program"
            name="program"
            value={form.program}
            onChange={(e) => set('program')(e.target.value)}
            className="field-input"
          >
            <option value="">Select your program</option>
            {/* A college with no programs listed yet is skipped rather than
                shown as an empty group. */}
            {PROGRAMS_BY_COLLEGE.filter((c) => c.programs.length > 0).map((group) => (
              <optgroup key={group.college} label={group.college}>
                {group.programs.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={PROGRAM_OTHER}>{PROGRAM_OTHER}</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={fieldErrors.password}
          autoComplete="new-password"
          hint="At least 10 characters, with upper and lower case letters and a number."
          required
        />
        <Field
          id="confirmPassword"
          label="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          required
        />
      </div>

      <button type="submit" className="btn-primary mt-6 w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? 'Creating your account…' : 'Create account'}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Registering creates a student account. Adviser, panel, coordinator and administrator accounts are issued by
        the college and cannot be self-registered.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  autoComplete,
  placeholder,
  required,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="font-normal text-slate-400"> (optional)</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
