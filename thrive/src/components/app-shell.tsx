'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Logo } from './logo';
import { Icon } from './icons';
import { navFor } from './nav-config';
import { ROLE_LABELS, type Role } from '@/lib/constants';

type ShellUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

/** Matches the drawer-out animation duration in tailwind.config.ts. */
const DRAWER_EXIT_MS = 220;

export function AppShell({
  user,
  unreadCount,
  children,
}: {
  user: ShellUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const sections = navFor(user.role);

  // Play the slide-out before unmounting, so dismissing the drawer reads as a
  // movement rather than a disappearance.
  // Nav links call this at every screen size, so bail out when there is no open
  // drawer (desktop) or one is already sliding away (backdrop tap, then Escape).
  const closeDrawer = useCallback(() => {
    if (!mobileOpen || closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setMobileOpen(false);
      setClosing(false);
    }, DRAWER_EXIT_MS);
  }, [mobileOpen, closing]);

  const openDrawer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(false);
    setMobileOpen(true);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // While the drawer covers the screen, the page behind it must not scroll and
  // Escape must dismiss it (keyboard parity with the close button).
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    drawerRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, closeDrawer]);

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-5">
        <Logo href="/dashboard" />
        <button
          type="button"
          onClick={closeDrawer}
          className="btn-ghost btn-sm lg:hidden"
          aria-label="Close navigation"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        {sections.map((section) => (
          <div key={section.heading} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeDrawer}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                        'transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.98]',
                        active
                          ? 'bg-csu-50 text-csu-800'
                          : 'text-slate-600 hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-900',
                      )}
                    >
                      {/* Active rail, grown in rather than snapped on. */}
                      <span
                        aria-hidden
                        className={clsx(
                          'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-csu-600',
                          'origin-center transition-transform duration-300 ease-out',
                          active ? 'scale-y-100' : 'scale-y-0',
                        )}
                      />
                      <Icon
                        name={item.icon}
                        className={clsx(
                          'h-[18px] w-[18px] shrink-0 transition-transform duration-200',
                          !active && 'group-hover:scale-110',
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.href === '/notifications' && unreadCount > 0 && (
                        <span className="ml-auto animate-scale-in rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-3 pb-safe-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-csu-100 text-sm font-semibold text-csu-800">
            {user.firstName[0]}
            {user.lastName[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role as Role] ?? user.role}</p>
          </div>
        </div>
        <button type="button" onClick={signOut} disabled={signingOut} className="btn-ghost btn-sm mt-1 w-full justify-start">
          <Icon name="logout" className={clsx('h-[18px] w-[18px]', signingOut && 'animate-pulse')} />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block xl:w-72">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className={clsx(
              'absolute inset-0 bg-slate-900/40 backdrop-blur-sm',
              closing ? 'animate-fade-out' : 'animate-fade-in',
            )}
            onClick={closeDrawer}
          />
          <aside
            ref={drawerRef}
            tabIndex={-1}
            aria-label="Main navigation"
            className={clsx(
              'absolute inset-y-0 left-0 w-[min(18rem,85vw)] bg-white shadow-2xl outline-none',
              closing ? 'animate-drawer-out' : 'animate-drawer-in',
            )}
          >
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64 xl:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/85 px-3 backdrop-blur-md transition-shadow sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={openDrawer}
            className="btn-ghost btn-sm lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-700 sm:text-sm">
              {ROLE_LABELS[user.role as Role] ?? user.role} workspace
            </p>
          </div>

          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-slate-600 transition duration-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Icon name="bell" className={clsx('h-5 w-5', unreadCount > 0 && 'animate-float')} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 animate-scale-in items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </header>

        {/* Keyed on the route so each navigation replays the entrance. */}
        <main key={pathname} className="mx-auto max-w-7xl animate-fade-up px-4 py-6 pb-safe-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
