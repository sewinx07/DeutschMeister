'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RingProgress } from '@/components/shared/ring-progress';
import { useApp } from '@/lib/store/app-store';
import {
  currentStreak,
  totalXp,
  unlockedAchievements,
  xpLevel,
} from '@/lib/engine/gamify';
import {
  mockExamTrend,
  skillTrends,
  studyMinutesPerDay,
  weekGoals,
} from '@/lib/engine/analytics';
import { computeReadiness } from '@/lib/engine/readiness';
import { SKILL_LABELS } from '@/types';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  LineChart,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';

const SKILL_COLORS: Record<string, string> = {
  vocabulary: '#8b5cf6',
  grammar: '#6366f1',
  reading: '#0ea5e9',
  listening: '#14b8a6',
  writing: '#f59e0b',
  speaking: '#ef4444',
};

export default function ProgressPage() {
  const { db } = useApp();

  const data = useMemo(() => {
    if (!db || !db.user) return null;
    const xp = totalXp(db);
    const lvl = xpLevel(xp);
    const goals = weekGoals(db);
    const daily = studyMinutesPerDay(db.studySessions, 14);
    const skills = skillTrends(db);
    const exams = mockExamTrend(db.mockResults);
    const streak = currentStreak(db);
    const consistency = Math.min(1, streak / 14);
    const readiness = computeReadiness(
      db.user,
      db.skills,
      db.mockResults,
      consistency,
      db.tasks.filter((t) => t.status === 'done').length
    );
    const unlocks = unlockedAchievements(db);
    return { xp, lvl, goals, daily, skills, exams, streak, readiness, unlocks };
  }, [db]);

  if (!db || !db.user || !data) return null;

  const { xp, lvl, goals, daily, skills, exams, streak, readiness, unlocks } = data;

  const examData = exams.map((e) => ({ label: new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), percent: Math.round(e.percent) }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Progress"
        description="Your consistency, skill growth and exam readiness at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Trophy className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Level</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">Level {lvl.level}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Flame className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Streak</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">{streak} days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Sparkles className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total XP</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">{xp} XP</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><Award className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Achievements</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">{unlocks.length} / {db.achievements.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Study time (last 14 days)</CardTitle>
            <CardDescription>Minutes of focused German practice per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="minutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={2} fill="url(#minutes)" name="minutes" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>Projected exam readiness</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <RingProgress
              value={readiness.score}
              size={140}
              label={`${readiness.score}%`}
              sub={readiness.confidence}
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
            <p className="text-center text-xs text-muted-foreground">{readiness.recommendedAction}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Weekly goals</CardTitle>
          <CardDescription>Your target vs actual for this week.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Study minutes</span>
                <span className="font-medium tabular-nums text-foreground">{goals.actualMinutes} / {goals.targetMinutes}</span>
              </div>
              <Progress value={(goals.actualMinutes / Math.max(1, goals.targetMinutes)) * 100} className="h-2.5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tasks</span>
                <span className="font-medium tabular-nums text-foreground">{goals.actualTasks} / {goals.targetTasks}</span>
              </div>
              <Progress value={(goals.actualTasks / Math.max(1, goals.targetTasks)) * 100} className="h-2.5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall completion</span>
                <span className="font-medium tabular-nums text-foreground">{Math.round(goals.completionRate * 100)}%</span>
              </div>
              <Progress value={goals.completionRate * 100} className="h-2.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Skill levels</CardTitle>
            <CardDescription>Current score per skill.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skills.map((s) => ({ name: SKILL_LABELS[s.skill], score: Math.round(s.current), fill: SKILL_COLORS[s.skill] ?? '#6366f1' }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChart className="h-4 w-4" /> Mock exam trend</CardTitle>
            <CardDescription>Percent score across your mock exams.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {examData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Target className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Take your first mock exam to see your trend.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={examData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="exam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: 'var(--foreground)' }}
                  />
                  <Area type="monotone" dataKey="percent" stroke="#14b8a6" strokeWidth={2} fill="url(#exam)" name="score" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4" /> Achievements</CardTitle>
          <CardDescription>Badges you unlock as you build your skills.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {db.achievements.map((a) => {
              const unlocked = !!a.unlockedAt;
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 ${unlocked ? 'border-primary/40 bg-primary/[0.03]' : 'border-border opacity-60'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{a.icon}</span>
                    {unlocked ? <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" /> Unlocked</Badge> : null}
                  </div>
                  <p className="mt-2 font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Progress value={(a.progress / Math.max(1, a.target)) * 100} className="h-1.5 flex-1" />
                    <span className="text-xs tabular-nums text-muted-foreground">{a.progress}/{a.target}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
