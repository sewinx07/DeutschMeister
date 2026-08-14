'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RingProgress } from '@/components/shared/ring-progress';
import { StatCard } from '@/components/shared/stats';
import { useApp } from '@/lib/store/app-store';
import { computeReadiness, readinessLabel } from '@/lib/engine/readiness';
import { totalXp, xpLevel, currentStreak } from '@/lib/engine/gamify';
import { totalStudyMinutes } from '@/lib/engine/analytics';
import { todaysTasks } from '@/lib/engine/plan';
import { SKILL_LABELS, SKILL_DESC } from '@/types';
import { diffDays, formatDate } from '@/lib/db/storage';
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Rocket,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const TASK_TYPE_ICONS: Record<string, typeof BookOpenCheck> = {
  grammar: BookOpenCheck,
  vocabulary: BookOpenCheck,
  listening: BookOpenCheck,
  reading: BookOpenCheck,
  writing: BookOpenCheck,
  speaking: BookOpenCheck,
  mock_exam: CalendarDays,
  review: CheckCircle2,
  mistakes: BookOpenCheck,
};

export default function DashboardPage() {
  const { db, completeTask, startTask } = useApp();

  const data = useMemo(() => {
    if (!db || !db.user) return null;
    const tasks = todaysTasks(db.tasks);
    const sessions = db.studySessions;
    const consistency = Math.min(1, currentStreak(db) / 14);
    const completed = db.tasks.filter((t) => t.status === 'done').length;
    const readiness = computeReadiness(db.user, db.skills, db.mockResults, consistency, completed);
    const xp = totalXp(db);
    const lvl = xpLevel(xp);
    const minutes = totalStudyMinutes(sessions);
    const daysLeft = Math.max(0, diffDays(new Date(), new Date(db.user.examDate)));
    return { tasks, readiness, xp, lvl, minutes, daysLeft };
  }, [db]);

  if (!db || !db.user || !data) return null;

  const { tasks, readiness, xp, lvl, minutes, daysLeft } = data;
  const completedToday = tasks.filter((t) => t.status === 'done').length;
  const firstName = db.user.name.split(' ')[0];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(new Date().toISOString())}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Guten Tag, {firstName}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} until your ${db.user.examType} exam.`
              : 'Your exam is today. Give it your best!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
            <Flame className="h-4 w-4 text-orange-500" />
            {currentStreak(db)} day streak
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
            <Award className="h-4 w-4 text-amber-500" />
            Level {lvl.level}
          </Badge>
        </div>
      </section>

      {readiness.biggestRisk ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {SKILL_LABELS[readiness.biggestRisk]} ({SKILL_DESC[readiness.biggestRisk]}) is your weakest skill.
            </p>
            <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-300/80">
              {readiness.recommendedAction}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Exam readiness"
          icon={TrendingUp}
          value={`${readiness.score}%`}
          sub={readinessLabel(readiness.score)}
        />
        <StatCard
          label="Total study time"
          icon={Clock}
          value={`${Math.round(minutes / 60)}h`}
          sub={`${minutes} min total`}
        />
        <StatCard
          label="Mock exam avg"
          icon={CalendarDays}
          value={db.mockResults.length ? `${Math.round(db.mockResults.reduce((a, r) => a + r.percent, 0) / db.mockResults.length)}%` : '—'}
          sub={db.mockResults.length ? `${db.mockResults.length} exam${db.mockResults.length > 1 ? 's' : ''} taken` : 'No exams yet'}
        />
        <StatCard
          label="XP this week"
          icon={Sparkles}
          value={`${xp} XP`}
          sub={`${lvl.next - lvl.current} to level ${lvl.level + 1}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s mission</CardTitle>
            <CardDescription>
              {completedToday} of {tasks.length} completed ·{' '}
              {tasks.reduce((a, t) => a + (t.status !== 'done' && t.status !== 'rest' ? t.durationMinutes : 0), 0)} min left
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <p className="text-sm text-muted-foreground">No tasks scheduled for today.</p>
                <Link href="/plan">
                  <Button variant="outline" size="sm">View your study plan</Button>
                </Link>
              </div>
            ) : (
              tasks.map((task) => {
                if (task.status === 'rest') {
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl border border-dashed p-4"
                    >
                      <Flame className="h-4 w-4 text-orange-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Rest day</p>
                        <p className="text-xs text-muted-foreground">
                          Your plan schedules recovery. Light review only — your brain consolidates on rest days.
                        </p>
                      </div>
                    </div>
                  );
                }
                const Icon = TASK_TYPE_ICONS[task.type] ?? BookOpenCheck;
                const done = task.status === 'done';
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                      done ? 'border-muted bg-muted/40' : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        done ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Icon className="h-4.5 w-4.5" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {SKILL_LABELS[task.skill]} · {task.durationMinutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{task.status.replace('_', ' ')}</Badge>
                      {!done && task.status !== 'in_progress' ? (
                        <Button size="sm" onClick={() => startTask(task.id)}>Start</Button>
                      ) : null}
                      {!done ? (
                        <Button size="sm" variant="outline" onClick={() => completeTask(task.id)}>
                          Complete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>Your projected exam readiness</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <RingProgress
              value={readiness.score}
              size={148}
              strokeWidth={12}
              label={`${readiness.score}%`}
              sub={readinessLabel(readiness.score)}
              colorClass={
                readiness.score >= 80
                  ? 'stroke-emerald-500'
                  : readiness.score >= 60
                  ? 'stroke-primary'
                  : readiness.score >= 40
                  ? 'stroke-amber-500'
                  : 'stroke-rose-500'
              }
            />
            <div className="w-full space-y-2">
              {readiness.factors.map((f) => (
                <div key={f.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium tabular-nums text-foreground">{Math.round(f.value)}%</span>
                  </div>
                  <Progress value={Math.round(f.value)} className="h-1.5" />
                </div>
              ))}
            </div>
            <Link href="/plan" className="w-full">
              <Button className="w-full" variant="outline">Open study plan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SkillOverviewCard title="Vocabulary" value={db.skills.vocabulary.score} href="/vocabulary" label="Review words" />
        <SkillOverviewCard title="Grammar" value={db.skills.grammar.score} href="/grammar" label="Practice topics" />
        <SkillOverviewCard title="Listening" value={db.skills.listening.score} href="/listening" label="Train listening" />
      </div>
    </div>
  );
}

function SkillOverviewCard({
  title, value, href, label,
}: {
  title: string;
  value: number;
  href: string;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <span className="text-sm font-semibold tabular-nums text-primary">{Math.round(value)}%</span>
        </div>
        <Progress value={value} className="mt-3 h-2" />
        <Link href={href} className="mt-3 inline-block text-sm text-primary hover:underline">
          {label} →
        </Link>
      </CardContent>
    </Card>
  );
}
