'use client';

/**
 * Scroll-triggered entrance wrapper.
 *
 * Content renders fully on the server and is visible without JavaScript — the
 * hidden state is only applied once the observer is actually running, so a
 * failed hydration or a crawler never sees a blank section. Users who ask for
 * reduced motion skip the effect entirely (SRS 4.3.3).
 */

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import clsx from 'clsx';

export function Reveal({
  children,
  as = 'div',
  delay = 0,
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Milliseconds to hold before this element animates in. */
  delay?: number;
  className?: string;
}) {
  // Widened so a caller can pass any intrinsic tag without fighting the union
  // of every possible element's prop type.
  const Tag = as as 'div';
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    // Anything already on screen at mount animates immediately rather than
    // sitting hidden until the user scrolls.
    setArmed(true);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={clsx(armed && 'reveal', armed && visible && 'reveal-visible', className)}
    >
      {children}
    </Tag>
  );
}
