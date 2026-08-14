'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/lib/store/app-store';
import { analyzeSpeaking, SpeakingInput } from '@/lib/ai/speaking';
import { SpeakingAnalysis } from '@/lib/ai/schemas';
import { MistakeCategory, Mistake, SpeakingFeedback } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Mic, Sparkles } from 'lucide-react';

export default function SpeakingPage() {
  const { db, saveSpeakingSession, logStudySession, addMistake } = useApp();
  const prompts = useMemo(() => db?.speakingPrompts ?? [], [db]);
  const sessions = useMemo(() => db?.speakingSessions ?? [], [db]);
  const [activeId, setActiveId] = useState(prompts[0]?.id ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<SpeakingAnalysis | null>(null);

  if (!db) return null;

  const active = prompts.find((p) => p.id === activeId) ?? prompts[0];
  const answered = Object.values(answers).filter((a) => a.trim().length > 0).length;
  const total = active?.questions.length ?? 0;

  const selectPrompt = (id: string) => {
    setActiveId(id);
    setAnswers({});
    setAnalysis(null);
  };

  const finish = () => {
    if (!active) return;
    const input: SpeakingInput = {
      answers: active.questions.map((q) => ({ question: q, answer: answers[q] ?? '' })),
      durationMinutes: active.durationMinutes,
    };
    const result = analyzeSpeaking(input);
    setAnalysis(result);

    const now = new Date().toISOString();
    const feedbackMistakes: Mistake[] = result.mistakes.map((m, i) => ({
      id: `mis_${now}_${i}`,
      category: (m.category === 'grammar' ? 'verbs' : m.category) as MistakeCategory,
      original: m.original,
      correct: m.corrected,
      reason: m.reason,
      createdAt: now,
      reviewDate: now,
      reviewed: false,
      timesCorrect: 0,
    }));
    const feedback: SpeakingFeedback = {
      fluency: result.fluency,
      vocabulary: result.vocabulary,
      grammar: result.grammar,
      pronunciation: result.pronunciation,
      mistakes: feedbackMistakes,
      strengths: result.strengths,
      recommendedPhrases: result.recommendedPhrases,
    };

    saveSpeakingSession({
      id: `sp_${Date.now()}`,
      promptId: active.id,
      level: active.level,
      date: now,
      answers: input.answers,
      feedback,
      durationMinutes: active.durationMinutes,
    });
    logStudySession({ skill: 'speaking', minutes: active.durationMinutes, score: result.fluency, source: active.title });
    const categoryMap: Record<string, MistakeCategory> = {
      'word-order': 'word-order',
      grammar: 'verbs',
      spelling: 'spelling',
    };
    result.mistakes.slice(0, 3).forEach((m) => {
      const category = categoryMap[m.category];
      if (!category) return;
      addMistake({
        category,
        original: m.original,
        correct: m.corrected,
        reason: m.reason,
        reviewDate: new Date().toISOString(),
      });
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Speaking"
        description="Sprechen — practice exam-style interviews with AI feedback on fluency, grammar and vocabulary."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Scenarios ({prompts.length})
          </p>
          {prompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPrompt(p.id)}
              className={cn(
                'w-full rounded-xl border p-4 text-left transition-colors',
                p.id === active?.id ? 'border-primary/60 bg-primary/[0.04]' : 'border-border hover:bg-accent/50'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{p.title}</p>
                <Badge variant="secondary">{p.level}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.topic} · {p.durationMinutes} min
              </p>
            </button>
          ))}

          {sessions.length > 0 ? (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Past sessions ({sessions.length})
              </p>
              <div className="space-y-2">
                {sessions.slice(0, 6).map((s) => {
                  const p = prompts.find((x) => x.id === s.promptId);
                  return (
                    <div key={s.id} className="rounded-xl border p-3">
                      <p className="text-sm font-medium text-foreground">{p?.title ?? 'Session'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(s.date).toLocaleDateString()} · Fluency {s.feedback.fluency}/100
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {active ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" /> {active.title}
                </CardTitle>
                <CardDescription>{active.situation}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Answer each question as you would in an exam. Write your spoken answers, then get instant feedback.
                </p>
                {active.questions.map((q, i) => (
                  <div key={i}>
                    <p className="mb-1.5 text-sm font-medium text-foreground">
                      {i + 1}. {q}
                    </p>
                    <Textarea
                      value={answers[q] ?? ''}
                      onChange={(e) => {
                        setAnswers((a) => ({ ...a, [q]: e.target.value }));
                        setAnalysis(null);
                      }}
                      placeholder="Your answer…"
                      rows={3}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    {answered}/{total} answered
                  </p>
                  <Button onClick={finish} disabled={answered === 0}>
                    <Sparkles className="mr-2 h-4 w-4" /> Finish & analyze
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {analysis ? <SpeakingFeedbackPanel analysis={analysis} /> : null}
        </div>
      </div>
    </div>
  );
}

function SpeakingFeedbackPanel({ analysis }: { analysis: SpeakingAnalysis }) {
  const factors: { label: string; value: number }[] = [
    { label: 'Fluency', value: analysis.fluency },
    { label: 'Vocabulary', value: analysis.vocabulary },
    { label: 'Grammar', value: analysis.grammar },
    { label: 'Pronunciation', value: analysis.pronunciation },
  ];
  return (
    <Card className="border-emerald-500/30">
      <CardHeader>
        <CardTitle>AI Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {factors.map((f) => (
            <div key={f.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{f.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                  style={{ width: `${f.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {analysis.strengths.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> {s}
            </span>
          ))}
        </div>

        {analysis.mistakes.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Mistakes</p>
            <div className="space-y-2">
              {analysis.mistakes.map((m, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-rose-500 line-through">{m.original}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{m.corrected}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Phrases to learn</p>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendedPhrases.map((p) => (
              <span key={p} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {p}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
