import Link from 'next/link';
import clsx from 'clsx';

export function Logo({ href = '/', compact = false, inverted = false }: { href?: string; compact?: boolean; inverted?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-csu-600 to-csu-800 text-sm font-bold text-white shadow-sm"
      >
        T
      </span>
      <span className={clsx('leading-tight', compact && 'hidden sm:block')}>
        <span className={clsx('block text-sm font-bold tracking-tight', inverted ? 'text-white' : 'text-slate-900')}>
          CSU-THRIVE
        </span>
        <span className={clsx('block text-[11px]', inverted ? 'text-csu-100' : 'text-slate-500')}>
          Thesis Governance Platform
        </span>
      </span>
    </Link>
  );
}
