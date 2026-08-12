/**
 * Google sign-in, restricted to the institutional Workspace domain (FR-01).
 *
 * SECURITY NOTE: the `hd` authorization parameter is a *hint* that changes the
 * account chooser — it is not a guarantee, and a crafted request can come back
 * with any account. The domain is therefore re-checked server-side against the
 * verified ID token in the callback, and that check is what actually enforces
 * the rule. The same applies to `email_verified`.
 *
 * The whole feature is optional: with no client credentials configured, the
 * buttons never render and the routes refuse politely, so a deployment without
 * a Google project keeps working on passwords alone.
 */

import 'server-only';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { INSTITUTIONAL_EMAIL_DOMAIN } from './constants';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export const GOOGLE_STATE_COOKIE = 'thrive_oauth_state';
export const GOOGLE_NONCE_COOKIE = 'thrive_oauth_nonce';

export function googleClientId(): string | null {
  return process.env.GOOGLE_CLIENT_ID?.trim() || null;
}

function googleClientSecret(): string | null {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || null;
}

/** True only when both halves of the credential pair are present. */
export function isGoogleEnabled(): boolean {
  return Boolean(googleClientId() && googleClientSecret());
}

/**
 * The redirect URI must match the Google console entry byte for byte. behind a
 * reverse proxy the inbound request origin is the proxy's, so APP_URL wins when
 * it is set.
 */
export function googleRedirectUri(requestUrl: string): string {
  const base = process.env.APP_URL?.trim().replace(/\/$/, '') || new URL(requestUrl).origin;
  return `${base}/api/auth/google/callback`;
}

export function buildAuthorizationUrl(options: {
  state: string;
  nonce: string;
  redirectUri: string;
}): string {
  const clientId = googleClientId();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured.');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: options.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: options.state,
    nonce: options.nonce,
    // Account-chooser hint only — never trusted as the domain check.
    hd: INSTITUTIONAL_EMAIL_DOMAIN,
    prompt: 'select_account',
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

type TokenResponse = { id_token?: string };

export async function exchangeCodeForIdToken(code: string, redirectUri: string): Promise<string> {
  const clientId = googleClientId();
  const clientSecret = googleClientSecret();
  if (!clientId || !clientSecret) throw new Error('Google sign-in is not configured.');

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Google rejected the authorization code (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as TokenResponse;
  if (!payload.id_token) throw new Error('Google did not return an identity token.');
  return payload.id_token;
}

export type GoogleIdentity = {
  email: string;
  firstName: string;
  lastName: string;
};

/**
 * Verifies the token's signature against Google's published keys, then the
 * claims that actually matter: issuer, audience, expiry, replay nonce, address
 * ownership and institutional domain.
 */
export async function verifyIdToken(idToken: string, expectedNonce: string): Promise<GoogleIdentity> {
  const clientId = googleClientId();
  if (!clientId) throw new Error('Google sign-in is not configured.');

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
  });

  if (payload.nonce !== expectedNonce) {
    throw new Error('The sign-in request could not be matched to this browser.');
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase().trim() : '';
  if (!email) throw new Error('Google did not share an email address for that account.');

  // A Workspace account is always verified; refusing anything else keeps an
  // unverified consumer address from claiming an institutional identity.
  if (payload.email_verified !== true) {
    throw new Error('That Google account has an unverified email address.');
  }

  if (!email.endsWith(`@${INSTITUTIONAL_EMAIL_DOMAIN}`)) {
    throw new Error(`Sign in with your @${INSTITUTIONAL_EMAIL_DOMAIN} Google account.`);
  }

  const given = typeof payload.given_name === 'string' ? payload.given_name.trim() : '';
  const family = typeof payload.family_name === 'string' ? payload.family_name.trim() : '';
  const full = typeof payload.name === 'string' ? payload.name.trim() : '';
  const [fallbackFirst, ...fallbackRest] = (full || email.split('@')[0]).split(' ');

  return {
    email,
    firstName: given || fallbackFirst || 'Student',
    lastName: family || fallbackRest.join(' ') || '—',
  };
}
