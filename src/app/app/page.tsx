import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stats';
import { CheckCircle2, Clock, Compass, Flame, ShieldAlert } from 'lucide-react';
import { getStudySummary, loadTodayTasks } from '@/lib/server/study';
import { requireOrgContext } from '@/lib/server/org-context';
import { roleHasPermission } from '@/lib/server/rbac';
import { SKILL_LABELS } from '@/types';

export default async function AppHomePage() {
  const ctx = await requireOrgContext();
  const canManage =
    roleHasPermission(ctx.role, 'course.manage') || roleHasPermission(ctx.role, 'class.manage');

  const [summary, todayTasks] = await Promise.all([
    getStudySummary(ctx.org.id, ctx.user.id),
    loadTodayTasks(ctx.org.id, ctx.user.id),
  ]);

  const firstName = (ctx.user.name || 'there').split(' ')[0];

  if (!summary) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm text-muted-foreground">{ctx.org.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome, {firstName}</h1>
        </header>

        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Compass className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                {canManage ? 'Manage your courses and classes' : 'Start learning'}
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {canManage
                  ? 'Your study progress will appear here once you start using the learning space.'
                  : 'Your personalized study progress will appear here once you set up your learning plan.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {canManage ? (
                <>
                  <Button asChild>
                    <Link href="/app/courses">Browse courses</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/app/classes">Classes</Link>
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <Link href="/dashboard">Set up my learning plan</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const doneToday = todayTasks.filter((t) => t.status === 'done').length;
  const minutesLeft = todayTasks.reduce(
    (a, t) => a + (t.status !== 'done' && t.status !== 'rest' ? t.durationMinutes : 0),
    0,
  );
  const orderedTasks = [...todayTasks].sort(
    (a, b) => Number(a.status === 'done') - Number(b.status === 'done'),
  );
  const examLabel = summary.daysUntilExam
    ? summary.daysUntilExam > 0
      ? `${summary.daysUntilExam} day${summary.daysUntilExam === 1 ? '' : 's'}`
      : 'Today'
    : summary.examDate
      ? 'Date set'
      : 'Not set';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{ctx.org.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hi, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.currentPhase ? `Current phase: ${summary.currentPhase}` : 'No active plan phase yet'}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Open full dashboard</Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Exam"
          icon={Flame}
          value={examLabel}
          sub={summary.examDate ? `Target ${summary.targetLevel}` : 'Target level ' + summary.targetLevel}
        />
        <StatCard
          label="This week"
          icon={Clock}
          value={`${summary.minutesLast7d} min`}
          sub={`${summary.sessionsLast7d} session${summary.sessionsLast7d === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Vocabulary due"
          icon={CheckCircle2}
          value={summary.vocabularyDue}
          sub={`${summary.vocabularyMastered} of ${summary.vocabularyTotal} mastered`}
        />
        <StatCard
          label="Open mistakes"
          icon={ShieldAlert}
          value={summary.openMistakes}
          sub={summary.mockExamsTaken ? `Mock avg ${summary.mockAvgPercent}%` : 'No mock exams yet'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s plan</CardTitle>
            <CardDescription>
              {doneToday} of {todayTasks.length} done
              {minutesLeft > 0 ? ` · ${minutesLeft} min left` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 ? (
              <div className="space-y-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">No tasks scheduled for today.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/plan">View study plan</Link>
                </Button>
              </div>
            ) : (
              orderedTasks.map((task) => {
                if (task.isRest) {
                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5">
                      <Flame className="h-4 w-4 shrink-0 text-orange-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Rest day</p>
                        <p className="text-xs text-muted-foreground">Light review only — your brain consolidates.</p>
                      </div>
                    </div>
                  );
                }
                const done = task.status === 'done';
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                      done ? 'border-muted bg-muted/40' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${done ? 'text-muted-foreground line-through' : ''}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {SKILL_LABELS[task.skill]} · {task.durationMinutes} min
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {done ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done
                        </Badge>
                      ) : (
                        <Button size="sm" asChild>
                          <Link href={`/lessons/${task.id}`}>Start</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Level</CardTitle>
              <CardDescription>Current vs target</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-semibold tabular-nums">{summary.currentLevel}</span>
                <span className="text-sm text-muted-foreground">→ {summary.targetLevel}</span>
              </div>
            </CardContent>
          </Card>

          {summary.recentMistakes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent mistakes</CardTitle>
                <CardDescription>Top of your review queue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.recentMistakes.slice(0, 4).map((m) => (
                  <div key={m.id} className="space-y-0.5">
                    <p className="text-sm">
                      <span className="font-medium text-destructive line-through">{m.original}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{m.correct}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{m.category}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
