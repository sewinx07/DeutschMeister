import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Languages,
  MessageSquareText,
  Sparkles,
  Target,
} from 'lucide-react';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Adaptive study plan',
    description:
      'A phase-by-phase plan built around your exam date that automatically rebalances toward your weakest skills.',
  },
  {
    icon: Languages,
    title: 'All six skills',
    description:
      'Vocabulary with spaced repetition, grammar drills, listening with German audio, reading, writing and speaking.',
  },
  {
    icon: Target,
    title: 'Mock exams & readiness',
    description:
      'Full mock exams with instant scoring and a live readiness score that tells you if you are on track for exam day.',
  },
  {
    icon: BookOpen,
    title: 'Mistake bank',
    description:
      'Every wrong answer is captured, explained and scheduled for review so you stop repeating the same errors.',
  },
  {
    icon: MessageSquareText,
    title: 'AI coach',
    description:
      'Ask about your plan, vocabulary or grammar anytime. Works instantly offline, and gets smarter with an optional API key.',
  },
  {
    icon: Briefcase,
    title: 'IT-Ausbildung toolkit',
    description:
      'Ausbildung roadmap, application tracker, document checklists and a portfolio builder for your Fachinformatiker applications.',
  },
];

const STEPS = [
  {
    title: 'Tell us your goal',
    description: 'Pick your current level, target exam and date, and how much time you have per day.',
  },
  {
    title: 'Study the plan',
    description: 'Work through daily tasks across all six skills. The plan adapts as you make progress.',
  },
  {
    title: 'Track and apply',
    description: 'Watch your readiness score climb, then use the career tools to land your Ausbildung.',
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
            DeutschMeister
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
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
                German exam prep + IT-Ausbildung, in one place
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl">
                Pass your German exam.
                <br />
                Land your IT-Ausbildung.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
                A personal command center that plans your daily study, drills all six German
                skills, tracks your exam readiness, and prepares you for applications — for
                real.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="h-11 px-6 text-base" asChild>
                  <Link href="/signup">Get started free</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-11 px-6 text-base" asChild>
                  <Link href="/onboarding">Explore the German exam demo</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Try the demo without signing up · or create a free account for teams and schools
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Everything you need to prepare
              </h2>
              <p className="mt-3 text-muted-foreground">
                Built for the 24 September 2026 exam cycle and the Fachinformatiker job market.
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
              Your exam countdown is already running
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Start with a 2-minute setup and get your personal plan today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="h-11 px-6 text-base" asChild>
                <Link href="/signup">
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Get started free
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            DeutschMeister — made for German learners and IT applicants.
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/onboarding" className="hover:text-foreground">Start</Link>
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
