'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useApp } from '@/lib/store/app-store';
import { uid } from '@/lib/db/storage';
import { formatDate } from '@/lib/db/storage';
import { MockExamResult, MockExamTemplate } from '@/types';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Mic,
  PenLine,
  Play,
  Volume2,
} from 'lucide-react';

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  window.speechSynthesis.speak(u);
}

export default function MockExamsPage() {
  const { db, submitMockResult } = useApp();
  const [runningTemplate, setRunningTemplate] = useState<MockExamTemplate | null>(null);

  if (!db) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mock exams"
        description="Simulate the real exam under timed conditions. Your score feeds directly into your readiness estimate."
      />

      {runningTemplate ? (
        <ExamRunner template={runningTemplate} onSubmit={submitMockResult} onExit={() => setRunningTemplate(null)} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {db.mockExams.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{t.level}</Badge>
                    <Badge variant="outline">{t.durationMinutes} min</Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg">{t.name}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {t.sections.map((s) => (
                      <Badge key={s.id} variant="secondary">
                        {s.name} · {s.durationMinutes}m
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-auto">
                    <Button className="w-full" onClick={() => setRunningTemplate(t)}>
                      <Play className="mr-2 h-4 w-4" /> Start exam
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your results</CardTitle>
              <CardDescription>Every mock exam you&apos;ve completed.</CardDescription>
            </CardHeader>
            <CardContent>
              {db.mockResults.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No exams taken yet. Pick one above to see your baseline.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...db.mockResults].reverse().map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl border p-4">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                          r.percent >= 70
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : r.percent >= 50
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {Math.round(r.percent)}%
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.date)} · {r.durationMinutes} min
                        </p>
                      </div>
                      {r.weakTopics.length > 0 ? (
                        <div className="hidden flex-wrap gap-1 sm:flex">
                          {r.weakTopics.slice(0, 3).map((w) => (
                            <Badge key={w} variant="secondary">{w}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ExamRunner({
  template,
  onSubmit,
  onExit,
}: {
  template: MockExamTemplate;
  onSubmit: (result: MockExamResult) => void;
  onExit: () => void;
}) {
  const flat = useMemo(() => {
    const items: { sectionIndex: number; item: (typeof template.sections)[number]['items'][number] }[] = [];
    template.sections.forEach((s, si) => s.items.forEach((it) => items.push({ sectionIndex: si, item: it })));
    return items;
  }, [template]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  const total = flat.length;
  const current = flat[index];
  const section = template.sections[current.sectionIndex];
  const answered = answers[current.item.id] !== undefined;
  const pctDone = Math.round((index / total) * 100);

  const select = (value: string) => {
    setAnswers((a) => ({ ...a, [current.item.id]: value }));
    setTimeout(() => {
      if (index + 1 < total) setIndex(index + 1);
      else setFinished(true);
    }, 120);
  };

  const finish = () => {
    const sectionScores = template.sections.map((s) => {
      let score = 0;
      let maxScore = 0;
      for (const it of s.items) {
        maxScore += it.maxPoints;
        if (it.kind === 'mcq') {
          if (answers[it.id] && answers[it.id] === it.answer) score += it.maxPoints;
        } else if (answers[it.id] && answers[it.id].trim().length >= 3) {
          score += it.maxPoints;
        }
      }
      return { sectionId: s.id, name: s.name, score, maxScore };
    });
    const totalScore = sectionScores.reduce((a, s) => a + s.score, 0);
    const totalMaxScore = sectionScores.reduce((a, s) => a + s.maxScore, 0);
    const percent = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    const mistakes = flat
      .filter(({ item }) => item.kind === 'mcq' && answers[item.id] && answers[item.id] !== item.answer)
      .map(({ item }) => ({
        id: uid('mis'),
        category: section.skill,
        subcategory: section.name,
        original: answers[item.id] ?? '',
        correct: item.answer ?? '',
        reason: item.prompt.slice(0, 120),
        createdAt: new Date().toISOString(),
        reviewDate: new Date().toISOString(),
        reviewed: false,
        timesCorrect: 0,
      }));

    const bySection = new Map<string, number>();
    for (const sc of sectionScores) {
      const pct = sc.maxScore > 0 ? (sc.score / sc.maxScore) * 100 : 100;
      bySection.set(sc.name, pct);
    }
    const weakTopics = Array.from(bySection.entries())
      .filter(([, pct]) => pct < 70)
      .map(([name]) => name);

    onSubmit({
      id: uid('me'),
      templateId: template.id,
      name: template.name,
      level: template.level,
      date: new Date().toISOString(),
      durationMinutes: template.durationMinutes,
      sectionScores,
      totalScore,
      totalMaxScore,
      percent,
      answers,
      mistakes,
      weakTopics,
    });
    setFinished(true);
  };

  if (finished) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-xl font-semibold text-foreground">Exam submitted!</p>
          <p className="text-sm text-muted-foreground">
            Your result has been added to your history and readiness estimate.
          </p>
          <div className="flex gap-2">
            <Button onClick={onExit}>Back to exams</Button>
            <Button variant="outline" onClick={() => { setIndex(0); setAnswers({}); setFinished(false); }}>
              Retake
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{template.name}</p>
          <p className="font-medium text-foreground">
            {section.name} · question {index + 1} of {total}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
      </div>
      <Progress value={pctDone} className="h-2" />

      <Card>
        <CardContent className="space-y-5 p-6">
          {current.item.kind === 'mcq' ? (
            <>
              {current.item.audio ? (
                <Button variant="outline" size="sm" onClick={() => speak(current.item.prompt)}>
                  <Volume2 className="mr-2 h-4 w-4" /> Play audio
                </Button>
              ) : null}
              <p className="font-medium text-foreground">{current.item.prompt}</p>
              <RadioGroup value={answers[current.item.id] ?? ''} onValueChange={select}>
                {(current.item.options ?? []).map((opt) => (
                  <div
                    key={opt}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <RadioGroupItem value={opt} id={`${current.item.id}-${opt}`} />
                    <Label htmlFor={`${current.item.id}-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </>
          ) : current.item.kind === 'writing' ? (
            <>
              <div className="flex items-center gap-2 text-primary">
                <PenLine className="h-4 w-4" /> Writing task · {current.item.maxPoints} pts
              </div>
              <p className="font-medium text-foreground">{current.item.text ?? current.item.prompt}</p>
              <Textarea
                value={answers[current.item.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [current.item.id]: e.target.value }))}
                placeholder="Schreiben Sie hier…"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">Self-graded: your answer counts toward the section score if it has at least 3 characters.</p>
            </>
          ) : current.item.kind === 'speaking' ? (
            <>
              <div className="flex items-center gap-2 text-primary">
                <Mic className="h-4 w-4" /> Speaking task · {current.item.maxPoints} pts
              </div>
              <p className="font-medium text-foreground">{current.item.text ?? current.item.prompt}</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => speak(current.item.prompt)}>
                  <Volume2 className="mr-2 h-4 w-4" /> Read prompt
                </Button>
                <Textarea
                  value={answers[current.item.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [current.item.id]: e.target.value }))}
                  placeholder="Transcribe your spoken answer, or jot your talking points…"
                  rows={4}
                />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">{current.item.prompt}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Previous
        </Button>
        {index + 1 === total ? (
          <Button onClick={finish}>Submit exam</Button>
        ) : (
          <Button disabled={!answered && current.item.kind === 'mcq'} onClick={() => setIndex(index + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
