/**
 * Authentication and session management (FR-01 to FR-05, NFR-05, NFR-07).
 *
 * Sessions are stateless JWTs (HS256) held in an httpOnly, SameSite=Lax cookie.
 * Passwords are stored only as bcrypt hashes; recovery tokens only as SHA-256
 * digests with an expiry (FR-08).
 */

import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from './prisma';
import { USER_STATUS } from './constants';

export const SESSION_COOKIE = 'thrive_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionUser = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  department: string | null;
  college: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Set a value of at least 32 characters in .env (SRS NFR-09).',
    );
  }
  return new TextEncoder().encode(secret);
}

// --- passwords ---------------------------------------------------------------

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- tokens ------------------------------------------------------------------

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    department: user.department,
    college: user.college,
  } satisfies JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer('csu-thrive')
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: 'csu-thrive' });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ''),
      role: String(payload.role ?? ''),
      firstName: String(payload.firstName ?? ''),
      lastName: String(payload.lastName ?? ''),
      department: (payload.department as string | null) ?? null,
      college: String(payload.college ?? 'CCIS'),
    };
  } catch {
    return null;
  }
}

// --- session lifecycle -------------------------------------------------------

export async function startSession(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Resolves the current session and re-checks account status on every request,
 * so a deactivated account loses access immediately even while holding a
 * still-valid token (FR-04).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await readSessionToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      department: true,
      college: true,
    },
  });

  if (!user || user.status !== USER_STATUS.ACTIVE) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    department: user.department,
    college: user.college,
  };
}

// --- password recovery (FR-08, FR-09) ---------------------------------------

export const RESET_TOKEN_TTL_MINUTES = 30;

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
