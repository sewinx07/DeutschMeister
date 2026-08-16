'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store/app-store';
import { diffDays, formatDate, todayKey } from '@/lib/db/storage';
import { SKILL_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Circle,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react';

export default function PlanPage() {
  const { db, completeTask, skipTask, generateStudyPlan, adaptStudyPlan } = useApp();
  const [weeksAhead, setWeeksAhead] = useState(0);

  const data = useMemo(() => {
    if (!db || !db.user || !db.plan) return null;
    const today = todayKey();
    const daysLeft = diffDays(new Date(), new Date(db.user.examDate));
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + weeksAhead * 7);
    const startKey = todayKey() < weekStart.toISOString() ? weekStart.toISOString().slice(0, 10) : todayKey();
    const windowEnd = new Date(weekStart);
    windowEnd.setDate(windowEnd.getDate() + 7);
    const visible = db.tasks
      .filter((t) => t.date >= startKey && t.date < windowEnd.toISOString().slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date));
    const done = visible.filter((t) => t.status === 'done').length;
    const upcomingCount = db.tasks.filter((t) => t.date >= today && t.status !== 'done').length;
    return { daysLeft, startKey, visible, done, upcomingCount };
  }, [db, weeksAhead]);

  if (!db || !db.user || !db.plan || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Study plan" description="Your personalized plan has not been generated yet." />
        <Button onClick={generateStudyPlan}><Sparkles className="mr-2 h-4 w-4" /> Generate plan</Button>
      </div>
    );
  }

  const { daysLeft, startKey, visible, done, upcomingCount } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Study plan"
        description={`Generated for your ${db.user.examType} on ${formatDate(db.user.examDate)}. Days are weighted toward your weakest skills and rebalanced weekly.`}
        actions={
          <>
            <Button variant="outline" onClick={adaptStudyPlan}>
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Adapt to progress
            </Button>
            <Button variant="outline" onClick={generateStudyPlan}>
              <RotateCcw className="mr-2 h-4 w-4" /> Regenerate
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days until exam</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{daysLeft}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tasks remaining</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{upcomingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phases</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{db.plan.phases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journey phases</CardTitle>
          <CardDescription>Your roadmap from today to exam day.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-4">
            <div className="absolute left-[7px] top-2 bottom-2 hidden w-0.5 bg-muted sm:block sm:left-0 sm:top-auto sm:bottom-auto sm:h-0.5 sm:w-full" />
            {db.plan.phases.map((phase, i) => {
              const active = new Date() >= new Date(phase.start) && new Date() <= new Date(phase.end);
              const finished = new Date() > new Date(phase.end);
              return (
                <div key={phase.id} className="relative flex flex-1 items-start gap-3 sm:flex-col sm:gap-2">
                  <div
                    className={cn(
                      'z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      finished
                        ? 'border-emerald-500 bg-emerald-500'
                        : active
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/40 bg-background'
                    )}
                  >
                    {finished ? <CheckCircle2 className="h-2.5 w-2.5 text-white" /> : null}
                  </div>
                  <div className="pt-0.5">
                    <p className={cn('text-sm font-medium', active ? 'text-primary' : 'text-foreground')}>
                      {i + 1}. {phase.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(phase.start)} → {formatDate(phase.end)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {phase.focus.map((f) => (
                        <Badge key={f} variant="secondary" className="text-[10px]">
                          {SKILL_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Upcoming tasks</CardTitle>
            <CardDescription>
              {done} of {visible.length} done in this window
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={weeksAhead === 0} onClick={() => setWeeksAhead((w) => w - 1)}>
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              {formatDate(startKey)} — week {weeksAhead + 1}
            </span>
            <Button variant="outline" size="sm" onClick={() => setWeeksAhead((w) => w + 1)}>
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Circle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No tasks in this week.</p>
              <Link href="/dashboard" className="text-sm text-primary hover:underline">Back to today</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((task) => {
                const isRest = task.status === 'rest' || task.isRest;
                const isDone = task.status === 'done';
                const isToday = task.date === todayKey();
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3.5',
                      isRest
                        ? 'border-dashed'
                        : isDone
                        ? 'border-muted bg-muted/40'
                        : isToday
                        ? 'border-primary/40 bg-primary/[0.03]'
                        : 'border-border'
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Activity className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', isDone ? 'text-muted-foreground line-through' : 'text-foreground')}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(task.date)}{isToday ? ' · Today' : ''} · {SKILL_LABELS[task.skill]} · {task.durationMinutes} min
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isRest ? <Badge variant="secondary">Rest</Badge> : isDone ? (
                        <Badge variant="secondary">Done</Badge>
                      ) : (
                        <>
                          <Button size="sm" asChild variant={task.status === 'in_progress' ? 'default' : 'outline'}>
                            <Link href={`/lessons/${task.id}`}>
                              {task.status === 'in_progress' ? 'Continue' : 'Start'}
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => completeTask(task.id)}>
                            Complete
                          </Button>
                          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => skipTask(task.id)}>
                            Skip
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {db.plan.adjustments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent adaptations</CardTitle>
            <CardDescription>How your plan has been tuned based on your performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...db.plan.adjustments].reverse().slice(0, 5).map((adj) => (
                <div key={adj.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{adj.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(adj.date)} · +{adj.minutesAdded} min to {SKILL_LABELS[adj.skill]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
