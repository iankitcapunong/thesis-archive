/** Inline icon set — no external asset requests. */

import type { JSX } from 'react';

type IconProps = { className?: string };

const P = ({ d, className }: { d: string; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ?? 'h-5 w-5'}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

export const ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  home: (p) => <P {...p} d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M10 21v-6h4v6" />,
  folder: (p) => <P {...p} d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  archive: (p) => <P {...p} d="M3 7h18M5 7v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7M4 7l1.2-3h13.6L20 7M10 12h4" />,
  bell: (p) => <P {...p} d="M18 16V11a6 6 0 1 0-12 0v5l-1.5 3h15L18 16ZM10 22h4" />,
  user: (p) => <P {...p} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />,
  users: (p) => <P {...p} d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M17 11.5a3 3 0 1 0 0-6M18 20h3.5a5.5 5.5 0 0 0-4-5.3" />,
  inbox: (p) => <P {...p} d="M3 13h5l1.5 3h5L16 13h5M3 13l2.2-7.3A2 2 0 0 1 7.1 4h9.8a2 2 0 0 1 1.9 1.7L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  check: (p) => <P {...p} d="M9 12.5 11.5 15 16 9M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
  calendar: (p) => <P {...p} d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1ZM4 9.5h16M8 3v3M16 3v3" />,
  chart: (p) => <P {...p} d="M4 20V4M4 20h16M8 17v-5M12.5 17V8M17 17v-3" />,
  report: (p) => <P {...p} d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v5h5M9 13h6M9 17h4" />,
  shield: (p) => <P {...p} d="M12 3 20 6v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6ZM9 12l2 2 4-4" />,
  list: (p) => <P {...p} d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  logout: (p) => <P {...p} d="M15 17l5-5-5-5M20 12H9M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />,
  menu: (p) => <P {...p} d="M4 7h16M4 12h16M4 17h16" />,
  close: (p) => <P {...p} d="M6 6l12 12M18 6 6 18" />,
  upload: (p) => <P {...p} d="M12 16V4M8 8l4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  download: (p) => <P {...p} d="M12 4v12M8 12l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  lock: (p) => <P {...p} d="M6 10V8a6 6 0 1 1 12 0v2M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />,
  clock: (p) => <P {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2" />,
  warning: (p) => <P {...p} d="M12 9v4.5M12 17h.01M10.3 3.9 2.6 17.1A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Component = ICONS[name] ?? ICONS.list;
  return <Component className={className} />;
}
