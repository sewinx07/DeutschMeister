import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/store/app-store';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'DeutschMeister — German Exam & IT-Ausbildung Coach',
    template: '%s · DeutschMeister',
  },
  description:
    'Plan, practise and track your way to passing your German exam and landing an IT-Ausbildung in Germany. Adaptive study plan, SRS vocabulary, mock exams, an AI coach and a full application toolkit.',
  keywords: [
    'German exam preparation',
    'Goethe-Zertifikat',
    'telc',
    'DTZ',
    'B1 German',
    'Fachinformatiker',
    'IT-Ausbildung',
    'learn German',
    'Deutsch lernen',
    'German vocabulary',
    'German grammar',
  ],
  authors: [{ name: 'DeutschMeister' }],
  creator: 'DeutschMeister',
  openGraph: {
    type: 'website',
    siteName: 'DeutschMeister',
    title: 'DeutschMeister — German Exam & IT-Ausbildung Coach',
    description:
      'Your personal command center for passing your German exam and landing an IT-Ausbildung in Germany.',
  },
  twitter: {
    card: 'summary',
    title: 'DeutschMeister — German Exam & IT-Ausbildung Coach',
    description:
      'Adaptive study plans, SRS vocabulary, mock exams and an AI coach for German exam + IT-Ausbildung success.',
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: 'DeutschMeister',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#100f14' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProvider>{children}</AppProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
