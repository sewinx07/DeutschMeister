import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  BookOpen,
  Bell,
  CheckCircle2,
  GraduationCap,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'Multi-tenant organizations',
    description:
      'Each school or team gets its own isolated workspace with members, roles and permissions — owners, teachers and students.',
  },
  {
    icon: BookOpen,
    title: 'Course & class management',
    description:
      'Create courses with topics and lessons, assign them to classes, set due dates and track completion across your entire team.',
  },
  {
    icon: BarChart3,
    title: 'Progress & analytics',
    description:
      'Per-student study progress, cross-class analytics, at-risk flagging and an activity feed — all in one staff dashboard.',
  },
  {
    icon: Bell,
    title: 'Notifications & activity feed',
    description:
      'An org-wide event feed with role-aware visibility. Students see their own classes; staff see everything. Bell badge for unread alerts.',
  },
  {
    icon: Shield,
    title: 'Roles & permissions',
    description:
      'Granular RBAC: platform admin, organization owner, admin, teacher, student. Every action is permission-checked and audit-logged.',
  },
  {
    icon: Sparkles,
    title: 'AI-powered learning',
    description:
      'AI coach for questions, writing feedback and speaking analysis. Works offline with a built-in engine; smarter with an API key.',
  },
];

const STEPS = [
  {
    title: 'Create your organization',
    description: 'Sign up, name your school or team, and you are ready to go in under a minute.',
  },
  {
    title: 'Invite your team',
    description: 'Teachers, admins and students get invite links. They join with one click and land in the right role.',
  },
  {
    title: 'Track and grow',
    description: 'Create courses, assign homework, watch the analytics dashboard light up as your team learns.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            Lernio
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Create your school</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-5 px-3 py-1">
                Multi-tenant learning platform for schools &amp; teams
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl">
                The learning platform
                <br />
                your team actually uses.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
                Courses, classes, assignments, progress analytics and an AI coach —
                all in one place. Built for teachers, schools and organizations that
                take learning seriously.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="h-11 px-6 text-base" asChild>
                  <Link href="/signup">
                    <GraduationCap className="mr-2 h-5 w-5" /> Create your school
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-11 px-6 text-base" asChild>
                  <Link href="/onboarding">Try the demo</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Free to start · no credit card required
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Everything your organization needs
              </h2>
              <p className="mt-3 text-muted-foreground">
                From course creation to student analytics — one platform, not five tools.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border bg-background p-6 transition-colors hover:border-primary/40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-medium text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                How it works
              </h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="relative rounded-2xl border bg-background p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-medium text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Ready to get your team learning?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Set up your organization in under a minute. Invite teachers and students. Start tracking progress today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="h-11 px-6 text-base" asChild>
                <Link href="/signup">
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Create your school
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Lernio — the learning platform for schools and teams.
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/account" className="hover:text-foreground">Account</Link>
            <Link href="/login" className="hover:text-foreground">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
