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
    default: 'Lernio — Learning Platform for Schools & Teams',
    template: '%s · Lernio',
  },
  description:
    'Multi-tenant learning platform with courses, classes, assignments, progress analytics and an AI coach. Built for teachers, schools and organizations.',
  keywords: [
    'learning platform',
    'school management',
    'LMS',
    'course management',
    'student progress',
    'classroom',
    'e-learning',
    'education',
    'teachers',
    'students',
  ],
  authors: [{ name: 'Lernio' }],
  creator: 'Lernio',
  openGraph: {
    type: 'website',
    siteName: 'Lernio',
    title: 'Lernio — Learning Platform for Schools & Teams',
    description:
      'Courses, classes, assignments, progress analytics and an AI coach — all in one place.',
  },
  twitter: {
    card: 'summary',
    title: 'Lernio — Learning Platform for Schools & Teams',
    description:
      'Multi-tenant learning platform with courses, classes, assignments, analytics and an AI coach.',
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: 'Lernio',
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
