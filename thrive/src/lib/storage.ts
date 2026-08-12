/**
 * Secure document storage (FR-34, FR-65, SRS 4.2 File and Document Security).
 *
 * Files are written outside the public web root and are only ever served
 * through an authorized API route, so no uploaded manuscript is reachable by
 * URL guessing. Swap these two functions for an S3/MinIO client to move
 * storage off the application server without touching callers.
 */

import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { UPLOAD_RULES } from './constants';

const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR ?? path.join(process.cwd(), 'storage', 'documents'));

export type StoredFile = {
  storedName: string;
  sizeBytes: number;
  checksum: string;
};

export type ValidationResult = { ok: true } | { ok: false; message: string };

/** FR-34: reject unsupported types and oversized uploads before writing. */
export function validateUpload(file: { name: string; size: number; type: string }): ValidationResult {
  const ext = path.extname(file.name).toLowerCase();

  if (!UPLOAD_RULES.allowedExtensions.includes(ext)) {
    return {
      ok: false,
      message: `File type "${ext || 'unknown'}" is not permitted. Allowed formats: ${UPLOAD_RULES.allowedExtensions.join(', ')}.`,
    };
  }

  if (file.type && !UPLOAD_RULES.allowedMimeTypes.includes(file.type)) {
    return { ok: false, message: `Content type "${file.type}" is not permitted for thesis documents.` };
  }

  if (file.size <= 0) {
    return { ok: false, message: 'The selected file is empty.' };
  }

  if (file.size > UPLOAD_RULES.maxBytes) {
    const limitMb = Math.round(UPLOAD_RULES.maxBytes / (1024 * 1024));
    return { ok: false, message: `File exceeds the ${limitMb} MB limit. Please compress or split the document.` };
  }

  return { ok: true };
}

export async function saveDocument(originalName: string, bytes: Buffer): Promise<StoredFile> {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });

  const ext = path.extname(originalName).toLowerCase();
  const storedName = `${crypto.randomUUID()}${ext}`;
  const checksum = crypto.createHash('sha256').update(bytes).digest('hex');

  await fs.writeFile(path.join(STORAGE_ROOT, storedName), bytes);

  return { storedName, sizeBytes: bytes.byteLength, checksum };
}

export async function readDocument(storedName: string): Promise<Buffer> {
  // Guard against traversal even though stored names are generated UUIDs.
  const safe = path.basename(storedName);
  const full = path.join(STORAGE_ROOT, safe);
  if (!full.startsWith(STORAGE_ROOT)) throw new Error('Invalid document path.');
  return fs.readFile(full);
}

export async function deleteDocument(storedName: string): Promise<void> {
  try {
    await fs.unlink(path.join(STORAGE_ROOT, path.basename(storedName)));
  } catch {
    /* already gone */
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
