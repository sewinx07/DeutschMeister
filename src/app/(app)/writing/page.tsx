'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/lib/store/app-store';
import { analyzeWriting } from '@/lib/ai/writing';
import { WritingAnalysis } from '@/lib/ai/schemas';
import { MistakeCategory } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Info, Lightbulb, PenLine, Wand2 } from 'lucide-react';

export default function WritingPage() {
  const { db, logStudySession, addMistake } = useApp();
  const prompts = useMemo(() => db?.writingPrompts ?? [], [db]);
  const [activeId, setActiveId] = useState(prompts[0]?.id ?? '');
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);

  if (!db) return null;

  const active = prompts.find((p) => p.id === activeId) ?? prompts[0];
  const words = (text.match(/[a-zäöüß]+/gi) || []).length;

  const getFeedback = () => {
    const result = analyzeWriting(text);
    setAnalysis(result);
    logStudySession({ skill: 'writing', minutes: 10, score: result.score, source: active?.title ?? 'Writing prompt' });
    const categoryMap: Record<string, MistakeCategory> = {
      'word-order': 'word-order',
      grammar: 'verbs',
      punctuation: 'cases',
      spelling: 'spelling',
      capitalization: 'articles',
    };
    result.mistakes.slice(0, 3).forEach((m) => {
      const category = categoryMap[m.category];
      if (!category) return;
      addMistake({
        category,
        original: m.original,
        correct: m.corrected,
        reason: m.explanation,
        reviewDate: new Date().toISOString(),
      });
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Writing"
        description="Schreiben — draft emails and exam-style texts, then get instant AI feedback."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prompts ({prompts.length})
          </p>
          {prompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActiveId(p.id);
                setText('');
                setAnalysis(null);
              }}
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
                {p.minWords}–{p.maxWords} words · {p.skillFocus.join(', ')}
              </p>
            </button>
          ))}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {active ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-primary" /> {active.title}
                </CardTitle>
                <CardDescription>{active.situation}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-foreground">{active.task}</p>
                <div className="flex flex-wrap gap-2">
                  {active.requirements.map((r) => (
                    <span key={r} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {r}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="space-y-3 p-5">
              <Textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setAnalysis(null);
                }}
                placeholder="Write your text in German…"
                rows={10}
                className="min-h-48"
              />
              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    'text-xs tabular-nums',
                    active && words < active.minWords
                      ? 'text-muted-foreground'
                      : active && words > active.maxWords
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                  )}
                >
                  {words} words{active ? ` (target ${active.minWords}–${active.maxWords})` : ''}
                </p>
                <Button onClick={getFeedback} disabled={words < 5}>
                  <Wand2 className="mr-2 h-4 w-4" /> Get feedback
                </Button>
              </div>
            </CardContent>
          </Card>

          {analysis ? <FeedbackPanel analysis={analysis} /> : null}
        </div>
      </div>
    </div>
  );
}

function FeedbackPanel({ analysis }: { analysis: WritingAnalysis }) {
  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>AI Feedback</CardTitle>
        <div className="flex items-center gap-1.5 text-2xl font-bold tabular-nums text-foreground">
          {analysis.score}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
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
                  <p className="mt-1 text-xs text-muted-foreground">{m.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {analysis.correctedText !== analysis.mistakes[0]?.original && analysis.correctedText ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Corrected text</p>
            <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
              {analysis.correctedText}
            </p>
          </div>
        ) : null}

        {analysis.grammarTopics.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Recommended grammar topics</p>
            <div className="flex flex-wrap gap-2">
              {analysis.grammarTopics.map((t) => (
                <Badge key={t} variant="outline">{t}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        {analysis.betterVocabulary.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Lightbulb className="h-4 w-4 text-primary" /> Vocabulary upgrades
            </p>
            <div className="space-y-2">
              {analysis.betterVocabulary.map((v, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <span className="text-rose-500 line-through">{v.word}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{v.suggestion}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{v.context}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {analysis.recommendations.length > 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {analysis.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
