import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PreReleaseBanner from '@/components/diagnostics/PreReleaseBanner';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kriya — Pain Risk Assessment',
  description: 'AI-powered musculoskeletal pain risk assessment (CDE v4.1)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className="bg-[#020617] text-slate-200 antialiased"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        <PreReleaseBanner />
        {children}
      </body>
    </html>
  );
}
