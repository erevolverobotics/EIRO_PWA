import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/firebase/auth-context';
import { Toaster } from 'react-hot-toast';
import { PwaProvider } from '@/components/PwaProvider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'EIRO — Evolve Robotics Competition Platform',
    template: '%s | EIRO Platform',
  },
  description:
    'EIRO Robotics Competition Management Platform by Evolve Robotics — manage district preliminaries, state finals, team registrations, scoring, and certificates.',
  keywords: ['EIRO', 'robotics', 'competition', 'Evolve Robotics', 'sumo', 'maze solver'],
  authors: [{ name: 'Evolve Robotics' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EIRO',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: 'EIRO Robotics Competition Platform',
    description: 'Official competition management system for EIRO robotics events.',
    siteName: 'EIRO Platform',
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" sizes="512x512" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <PwaProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#111827',
                  color: '#f0f4ff',
                  border: '1px solid #1e2a3d',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#111827' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#111827' } },
              }}
            />
          </PwaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
