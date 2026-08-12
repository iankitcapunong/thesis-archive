/**
 * Route-level placeholder for the authenticated shell.
 *
 * Every page in this group queries the database on the server, so navigation
 * would otherwise sit on the previous screen with no feedback. This mirrors the
 * common header + stat row + panel layout so the swap to real content reads as
 * the same page filling in rather than a different page arriving.
 */

export default function AppLoading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="mb-6 space-y-2">
        <div className="skeleton h-7 w-52 max-w-full" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4 sm:p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-8 w-16" />
            <div className="skeleton mt-3 h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="space-y-3 p-5">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-2.5 w-full rounded-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-4 w-5/6" />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="skeleton h-4 w-28" />
          </div>
          <div className="space-y-3 p-5">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-4 w-3/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
