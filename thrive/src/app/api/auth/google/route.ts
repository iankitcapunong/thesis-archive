/**
 * GET /api/auth/google — starts the Google sign-in flow (FR-01).
 *
 * The state and nonce are held in short-lived httpOnly cookies rather than in
 * the URL, so the callback can prove the response belongs to a request this
 * browser actually made (CSRF) and to this specific attempt (replay).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import {
  isGoogleEnabled,
  buildAuthorizationUrl,
  googleRedirectUri,
  GOOGLE_STATE_COOKIE,
  GOOGLE_NONCE_COOKIE,
} from '@/lib/google';

const HANDOFF_TTL_SECONDS = 10 * 60;

export async function GET(request: Request) {
  if (!isGoogleEnabled()) {
    return NextResponse.redirect(new URL('/login?error=google_unavailable', request.url));
  }

  const state = crypto.randomBytes(24).toString('base64url');
  const nonce = crypto.randomBytes(24).toString('base64url');

  const jar = await cookies();
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: HANDOFF_TTL_SECONDS,
  };
  jar.set(GOOGLE_STATE_COOKIE, state, options);
  jar.set(GOOGLE_NONCE_COOKIE, nonce, options);

  return NextResponse.redirect(
    buildAuthorizationUrl({ state, nonce, redirectUri: googleRedirectUri(request.url) }),
  );
}
