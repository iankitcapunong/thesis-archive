/**
 * Route protection (FR-10, FR-11, FR-12).
 *
 * Runs before every page request:
 *   - unauthenticated user on a protected route -> /login?next=...
 *   - authenticated but out-of-scope route      -> /unauthorized
 *
 * This is the first of two gates. Every API route and server page repeats the
 * check against the database, so middleware alone is never the only defence
 * (NFR-06). Account status is re-verified there, since middleware runs on the
 * edge runtime without database access.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { mayEnterRoute, isKnownRoute } from '@/lib/rbac';

const SESSION_COOKIE = 'thrive_session';

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password', '/archive/public', '/unauthorized'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

async function readRole(token: string): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { issuer: 'csu-thrive' });
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const role = token ? await readRole(token) : null;

  // Signed-in users should not sit on the login screen.
  if (role && (pathname === '/login' || pathname === '/forgot-password')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isPublic(pathname)) return NextResponse.next();

  if (!role) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname + search);
    const response = NextResponse.redirect(login);
    if (token) response.cookies.delete(SESSION_COOKIE); // clear expired token
    return response;
  }

  // /dashboard is the role-dispatch page; always reachable when signed in.
  if (pathname === '/dashboard') return NextResponse.next();

  // An address in no known area is a wrong address, not a permission problem —
  // let it fall through to the not-found page (NFR-16).
  if (!isKnownRoute(pathname)) return NextResponse.next();

  if (!mayEnterRoute(role, pathname)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Page routes only. Static assets under `public/` must be excluded by
   * extension: without this an unauthenticated request for, say, the landing
   * page's hero image is redirected to /login, which serves HTML in place of
   * the file. Nothing sensitive is exposed — `public/` is served to anyone by
   * definition, and uploaded manuscripts live outside the web root and are
   * reachable only through the authorized download route (see lib/storage.ts).
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|eot|webmanifest|txt|xml)$).*)',
  ],
};
