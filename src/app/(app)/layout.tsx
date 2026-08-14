'use client';

import Link from 'next/link';
import { useApp } from '@/lib/store/app-store';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { db } = useApp();

  if (!db) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!db.user || !db.user.onboarded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Your exam command center awaits
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Set up your German exam profile and IT Ausbildung goal to generate a
            personalized, adaptive study plan.
          </p>
        </div>
        <Link href="/onboarding">
          <Button size="lg">Get started</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <div className="lg:pl-60">
        <div className="pt-14 lg:pt-0">
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
