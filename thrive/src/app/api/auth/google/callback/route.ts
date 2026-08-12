/**
 * GET /api/auth/google/callback — completes Google sign-in (FR-01, FR-04, FR-06).
 *
 * Nothing here trusts the query string. The identity comes from an ID token
 * whose signature is verified against Google's keys, and the institutional
 * domain is re-checked on the verified claim rather than on the `hd` hint sent
 * during authorization.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { startSession, hashPassword } from '@/lib/auth';
import { homeRouteFor } from '@/lib/rbac';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { ROLES, USER_STATUS } from '@/lib/constants';
import {
  isGoogleEnabled,
  exchangeCodeForIdToken,
  verifyIdToken,
  googleRedirectUri,
  GOOGLE_STATE_COOKIE,
  GOOGLE_NONCE_COOKIE,
} from '@/lib/google';

function back(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
}

export async function GET(request: Request) {
  if (!isGoogleEnabled()) return back(request, 'google_unavailable');

  const url = new URL(request.url);
  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  const expectedNonce = jar.get(GOOGLE_NONCE_COOKIE)?.value;

  // One attempt per handoff, whatever the outcome.
  jar.delete(GOOGLE_STATE_COOKIE);
  jar.delete(GOOGLE_NONCE_COOKIE);

  // The user dismissed Google's consent screen.
  if (url.searchParams.get('error')) return back(request, 'google_cancelled');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state || !expectedState || !expectedNonce) return back(request, 'google_expired');

  // Constant-time comparison — the state is a secret for the length of the flow.
  const given = Buffer.from(state);
  const expected = Buffer.from(expectedState);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return back(request, 'google_state');
  }

  let identity;
  try {
    const idToken = await exchangeCodeForIdToken(code, googleRedirectUri(request.url));
    identity = await verifyIdToken(idToken, expectedNonce);
  } catch (error) {
    console.error('[auth] google sign-in failed', error);
    // The domain rule is the only failure worth naming; everything else is a
    // transport or configuration fault the visitor cannot act on.
    const message = error instanceof Error ? error.message : '';
    return back(request, message.includes('@') ? 'google_domain' : 'google_failed');
  }

  const ip = clientIp(request);
  let user = await prisma.user.findUnique({ where: { email: identity.email } });

  if (user && user.status !== USER_STATUS.ACTIVE) {
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      summary: `Google sign-in refused for ${identity.email} (account status: ${user.status}).`,
      ipAddress: ip,
    });
    return back(request, 'inactive');
  }

  if (!user) {
    // First sign-in provisions a student, exactly as /signup does. Privileged
    // roles are never created here — an administrator issues those, and an
    // existing account keeps whatever role it already holds.
    user = await prisma.user.create({
      data: {
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
        role: ROLES.STUDENT,
        status: USER_STATUS.ACTIVE,
        // No password is ever set for a Google account; this random hash keeps
        // the column valid while making password sign-in impossible until the
        // holder sets one through account recovery.
        passwordHash: await hashPassword(crypto.randomBytes(32).toString('base64url')),
      },
    });

    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.USER_REGISTERED,
      entityType: 'User',
      entityId: user.id,
      summary: `${user.firstName} ${user.lastName} registered a student account via Google (${user.email}).`,
      metadata: { role: user.role, provider: 'google' },
      ipAddress: ip,
    });
  }

  await startSession({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    department: user.department,
    college: user.college,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    entityType: 'User',
    entityId: user.id,
    summary: `${user.firstName} ${user.lastName} signed in with Google.`,
    metadata: { provider: 'google' },
    ipAddress: ip,
  });

  return NextResponse.redirect(new URL(homeRouteFor(user.role), request.url));
}
