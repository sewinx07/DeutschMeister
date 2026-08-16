'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ClassStudentProgress } from '@/lib/server/class-progress';
import { formatDate } from '@/lib/db/storage';
import { SKILL_LABELS } from '@/types';
import type { SkillKey } from '@/types';

const SKILL_ORDER: SkillKey[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];

const MISTAKE_LABELS: Record<string, string> = {
  ...SKILL_LABELS,
  spelling: 'Spelling',
  articles: 'Articles',
  verbs: 'Verbs',
  cases: 'Cases',
  'word-order': 'Word order',
};

function skillAvg(progress: ClassStudentProgress['summary']): number | null {
  if (!progress) return null;
  const values = SKILL_ORDER.map((k) => progress.skills[k]?.score).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function lastActiveLabel(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

function StudentRow({ student, summary }: ClassStudentProgress) {
  const [open, setOpen] = useState(false);
  const avg = skillAvg(summary);

  return (
    <li className="divide-y">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
      >
        <span className="text-muted-foreground">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{student.name}</span>
            {summary?.onboarded && <Badge variant="secondary">onboarded</Badge>}
            {!summary && <Badge variant="outline">no data</Badge>}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{student.email}</span>
        </span>
        <span className="hidden text-right text-xs text-muted-foreground sm:block">
          {summary ? `${summary.currentLevel} → ${summary.targetLevel}` : '—'}
        </span>
        <span className="w-16 text-right text-sm tabular-nums">
          {avg === null ? '—' : `${avg}%`}
        </span>
      </button>

      {open && summary && (
        <div className="grid gap-4 px-4 py-4 sm:px-10 md:grid-cols-2">
          <div className="space-y-1.5">
            {SKILL_ORDER.map((key) => {
              const s = summary.skills[key];
              return (
                <div key={key} className="grid grid-cols-[92px_1fr_44px] items-center gap-2">
                  <span className="text-xs text-muted-foreground">{SKILL_LABELS[key]}</span>
                  <Progress value={s?.score ?? 0} />
                  <span className="text-right text-xs tabular-nums text-muted-foreground">
                    {s ? `${s.score}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Current phase</dt>
            <dd className="text-right tabular-nums">{summary.currentPhase ?? '—'}</dd>
            <dt className="text-muted-foreground">Exam</dt>
            <dd className="text-right tabular-nums">
              {summary.examDate
                ? `${formatDate(summary.examDate)}${summary.daysUntilExam !== null && summary.daysUntilExam >= 0 ? ` (${summary.daysUntilExam}d)` : ''}`
                : '—'}
            </dd>
            <dt className="text-muted-foreground">Tasks done</dt>
            <dd className="text-right tabular-nums">
              {summary.tasksDone}/{summary.tasksTotal}
            </dd>
            <dt className="text-muted-foreground">Study minutes</dt>
            <dd className="text-right tabular-nums">{summary.studyMinutesTotal}</dd>
            <dt className="text-muted-foreground">This week</dt>
            <dd className="text-right tabular-nums">
              {summary.sessionsLast7d} sessions · {summary.minutesLast7d} min
            </dd>
            <dt className="text-muted-foreground">Vocabulary</dt>
            <dd className="text-right tabular-nums">
              {summary.vocabularyMastered}/{summary.vocabularyTotal} mastered
            </dd>
            <dt className="text-muted-foreground">Mock exams</dt>
            <dd className="text-right tabular-nums">
              {summary.mockExamsTaken > 0
                ? `${summary.mockExamsTaken} · avg ${summary.mockAvgPercent}%`
                : 'none yet'}
            </dd>
            <dt className="text-muted-foreground">Open mistakes</dt>
            <dd className="text-right tabular-nums">{summary.openMistakes}</dd>
            <dt className="text-muted-foreground">Last active</dt>
            <dd className="text-right tabular-nums">{lastActiveLabel(summary.lastActiveAt)}</dd>
          </dl>

          {summary.recentMistakes.length > 0 && (
            <ul className="md:col-span-2 space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <li className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent mistakes</li>
              {summary.recentMistakes.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{m.original}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{MISTAKE_LABELS[m.category] ?? m.category}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export function ClassProgressPanel({ students }: { students: ClassStudentProgress[] }) {
  if (students.length === 0) {
    return (
      <Card>
        <p className="p-6 text-sm text-muted-foreground">No students enrolled in this class yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Study progress</h2>
          <p className="text-xs text-muted-foreground">
            Click a student to expand skills, activity, vocabulary and mistakes.
          </p>
        </div>
        <div className="hidden text-right text-xs text-muted-foreground sm:block">
          <p className="font-medium text-foreground">Overall</p>
          <p>Level</p>
        </div>
      </div>
      <ul className="divide-y">
        {students.map((s) => (
          <StudentRow key={s.student.id} {...s} />
        ))}
      </ul>
    </Card>
  );
}
