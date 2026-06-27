import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Study Agent App',
  description: 'A Next.js study agent application'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main>{children}</main>
      </body>
    </html>
  );
}
