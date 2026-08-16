import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, BookOpen, Clock, GraduationCap, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stats';
import { loadOrgAnalytics } from '@/lib/server/analytics';
import { requireOrgContext } from '@/lib/server/org-context';
import { canViewAnalytics } from '@/lib/server/rbac';

export const metadata = {
  title: 'Analytics',
};

function pct(part: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((part / total) * 100)}%`;
}

export default async function AnalyticsPage() {
  const ctx = await requireOrgContext();
  if (!canViewAnalytics(ctx.role)) notFound();

  const analytics = await loadOrgAnalytics(ctx.org.id);
  const { totals } = analytics;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Cross-class progress across {ctx.org.name}.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" icon={Users} value={totals.students} sub={`${totals.studentsWithData} with study data`} />
        <StatCard label="Active this week" icon={Clock} value={totals.activeLast7d} sub={`${totals.minutesLast7d} min studied`} />
        <StatCard label="Average skill" icon={GraduationCap} value={totals.avgSkill === null ? '—' : `${totals.avgSkill}%`} sub={`${totals.tasksDone}/${totals.tasksTotal} tasks done`} />
        <StatCard label="At-risk students" icon={AlertTriangle} value={totals.atRisk} sub={totals.atRisk > 0 ? 'Need attention' : 'All on track'} />
      </div>

      {analytics.classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No classes yet, so there is nothing to analyze. Create a class to see cross-class progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {analytics.classes.map((klass) => (
              <Link key={klass.classId} href={`/app/classes/${klass.classId}/progress`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{klass.subject}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {klass.studentsCount} student{klass.studentsCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <CardTitle className="text-base">{klass.className}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {klass.courseTitle}
                      {klass.teacherName ? ` · ${klass.teacherName}` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-semibold tabular-nums">{klass.avgSkill === null ? '—' : `${klass.avgSkill}%`}</p>
                        <p className="text-xs text-muted-foreground">Skill avg</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold tabular-nums">{pct(klass.tasksDone, klass.tasksTotal)}</p>
                        <p className="text-xs text-muted-foreground">Tasks done</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold tabular-nums">{klass.atRiskCount}</p>
                        <p className="text-xs text-muted-foreground">At risk</p>
                      </div>
                    </div>
                    {klass.atRiskCount > 0 && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> {klass.atRiskCount} student
                        {klass.atRiskCount === 1 ? '' : 's'} need attention
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> At-risk students
              </CardTitle>
              <CardDescription>
                Students with no study data, a low skill average, low task completion, or a week without activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.atRiskStudents.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No at-risk students. Everyone is on track.
                </p>
              ) : (
                <ul className="divide-y">
                  {analytics.atRiskStudents.map((s) => (
                    <li key={s.student.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.student.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.student.email}</p>
                      </div>
                      <span className="hidden text-xs text-muted-foreground sm:inline">{s.className}</span>
                      <span className="w-14 text-right text-sm tabular-nums">
                        {s.avgSkill === null ? '—' : `${s.avgSkill}%`}
                      </span>
                      <span className="hidden text-xs tabular-nums text-muted-foreground md:inline">
                        {s.tasksDone}/{s.tasksTotal} tasks
                      </span>
                      {s.daysInactive !== null && (
                        <span className="hidden text-xs tabular-nums text-muted-foreground lg:inline">
                          {s.daysInactive === 0 ? 'active today' : `${s.daysInactive}d ago`}
                        </span>
                      )}
                      <Badge variant="destructive">{s.reason}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
