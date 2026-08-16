import Link from 'next/link';
import { SignOutButton } from '@/components/app/sign-out-button';
import { requireOrgContext } from '@/lib/server/org-context';
import { canViewAnalytics, roleHasPermission } from '@/lib/server/rbac';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lernio',
  description: 'Your learning workspace.',
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext();
  const canManage = roleHasPermission(ctx.role, 'course.manage');
  const canAnalyze = canViewAnalytics(ctx.role);

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/app/courses" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                L
              </span>
              <span className="hidden sm:inline">{ctx.org.name}</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/app/courses"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Courses
              </Link>
              <Link
                href="/app/classes"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Classes
              </Link>
              <Link
                href="/app/assignments"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Assignments
              </Link>
              {canAnalyze && (
                <Link
                  href="/app/analytics"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Analytics
                </Link>
              )}
              <Link
                href="/account"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Account
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary sm:inline">
                {ctx.role.replaceAll('_', ' ').toLowerCase()}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
