import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CSU-THRIVE',
    template: '%s · CSU-THRIVE',
  },
  description:
    'Thesis Hub for Research, Innovation, Validation and Evaluation — the academic governance platform for undergraduate thesis management at Caraga State University.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#166b45',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
