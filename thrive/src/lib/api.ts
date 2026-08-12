/**
 * API helpers: uniform JSON envelopes, server-side guards and graceful failure
 * handling (FR-66, NFR-06, SRS 3.3.2).
 *
 * Error responses never echo stack traces, SQL or configuration values
 * (SRS 4.2 Input Validation and Application Security).
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { getCurrentUser, type SessionUser } from './auth';
import { can, type Permission } from './rbac';

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Requires an authenticated, active session (FR-01, NFR-05). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError('Authentication is required for this action.', 401);
  return user;
}

/** Requires an authenticated session holding a specific capability (NFR-06). */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    throw new ApiError('Your role does not permit this action.', 403);
  }
  return user;
}

export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError('Request body must be valid JSON.', 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('Some fields need your attention.', 422, flattenIssues(parsed.error));
  }
  return parsed.data;
}

function flattenIssues(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Wraps a route handler so that unexpected faults return an actionable,
 * non-leaking message instead of crashing the request (FR-66).
 */
export function handler<Args extends unknown[]>(
  fn: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await fn(request, ...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error.message, error.status, error.details);
      }
      if (error instanceof ZodError) {
        return fail('Some fields need your attention.', 422, flattenIssues(error));
      }
      console.error('[api] unhandled error', error);
      return fail(
        'The system could not complete this request. No changes were saved — please try again.',
        500,
      );
    }
  };
}
