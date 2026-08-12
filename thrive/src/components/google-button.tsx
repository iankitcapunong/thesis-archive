/**
 * "Continue with Google" entry point.
 *
 * Styled to Google's sign-in button guidance — white surface, unmodified
 * four-colour G mark, 40px target — so it reads as the control users already
 * recognise rather than as another house button. The mark itself is never
 * recoloured or reproportioned, which their brand terms require.
 *
 * A plain link rather than a fetch: the flow is a full-page redirect out to
 * Google and back, so it needs no client state and works without JavaScript.
 */

import { INSTITUTIONAL_EMAIL_DOMAIN } from '@/lib/constants';

export function GoogleButton() {
  return (
    <div>
      <div className="my-5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <a
        href="/api/auth/google"
        className="flex h-10 w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0]
                   bg-white px-3 text-sm font-medium text-[#1f1f1f] transition duration-200
                   hover:border-[#d2e3fc] hover:bg-[#f7fafe] hover:shadow-sm
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-csu-500
                   focus-visible:ring-offset-2 active:scale-[0.99]"
      >
        <GoogleMark />
        Continue with Google
      </a>

      <p className="mt-2 text-center text-xs text-slate-500">
        Only @{INSTITUTIONAL_EMAIL_DOMAIN} Google accounts are accepted.
      </p>
    </div>
  );
}

/** The official four-colour G. Do not recolour or rescale the paths. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
