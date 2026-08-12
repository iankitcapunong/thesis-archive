'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UPLOAD_RULES } from '@/lib/constants';
import { Icon } from '@/components/icons';

const MAX_MB = Math.round(UPLOAD_RULES.maxBytes / (1024 * 1024));

export function DocumentUpload({
  thesisId,
  requirementKey,
  requirementLabel,
  isRevision,
}: {
  thesisId: string;
  requirementKey: string;
  requirementLabel: string;
  isRevision: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Choose a file to submit.');
      return;
    }
    // Mirror of the server rules so the user gets feedback before uploading.
    if (file.size > UPLOAD_RULES.maxBytes) {
      setError(`This file is larger than the ${MAX_MB} MB limit.`);
      return;
    }

    setPending(true);
    const body = new FormData();
    body.append('file', file);
    body.append('requirementKey', requirementKey);

    try {
      const response = await fetch(`/api/theses/${thesisId}/documents`, { method: 'POST', body });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'The document could not be submitted.');
        setPending(false);
        return;
      }

      setSuccess(payload.data.message);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch {
      setError('The upload did not complete. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <p role="alert" className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_RULES.allowedExtensions.join(',')}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
          aria-label={`Upload ${requirementLabel}`}
          className="block w-full max-w-xs text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-csu-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-csu-700 hover:file:bg-csu-100"
        />
        <button type="submit" className="btn-primary btn-sm" disabled={pending || !file}>
          <Icon name="upload" className="h-4 w-4" />
          {pending ? 'Uploading…' : isRevision ? 'Submit revision' : 'Submit document'}
        </button>
      </div>

      <p className="mt-1.5 text-[11px] text-slate-500">
        Accepted: {UPLOAD_RULES.allowedExtensions.join(', ')} · maximum {MAX_MB} MB
        {isRevision && ' · this will be recorded as a new version'}
      </p>
    </form>
  );
}
