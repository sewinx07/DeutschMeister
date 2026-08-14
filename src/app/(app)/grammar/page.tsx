'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/store/app-store';
import { GrammarTopic } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';

export default function GrammarPage() {
  const { db } = useApp();
  const topics = useMemo(() => db?.grammar ?? [], [db]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of topics) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    return Array.from(map.entries());
  }, [topics]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = topics.find((t) => t.id === activeId) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Grammar"
        description="Structured grammar topics from A1 to B1 with interactive exercises."
      />

      {!active ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(([cat, count]) => {
            const catTopics = topics.filter((t) => t.category === cat);
            return (
              <div key={cat} className="space-y-2">
                <p className="px-1 text-sm font-medium text-muted-foreground">
                  {cat} <span className="text-muted-foreground/50">· {count}</span>
                </p>
                {catTopics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.examples.length} examples · {t.exercises.length} exercises
                      </p>
                    </div>
                    <Badge variant="secondary">{t.level}</Badge>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <GrammarDetail topic={active} onBack={() => setActiveId(null)} />
      )}
    </div>
  );
}

function GrammarDetail({ topic, onBack }: { topic: GrammarTopic; onBack: () => void }) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const ex = topic.exercises[exerciseIndex];
  const isLast = exerciseIndex === topic.exercises.length - 1;
  const isCorrect = selected === ex.answer;

  const next = () => {
    setSelected(null);
    setChecked(false);
    if (isLast) {
      onBack();
    } else {
      setExerciseIndex((i) => i + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← All topics</Button>
        <Badge variant="secondary">{topic.level}</Badge>
        <Badge variant="outline">{topic.category}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{topic.title}</CardTitle>
          <CardDescription>{topic.category} · {topic.exercises.length} exercises</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{topic.explanation}</p>
          <div className="space-y-2">
            {topic.examples.map((e, i) => (
              <div key={i} className="rounded-lg border p-3">
                <p className="font-medium text-foreground">{e.de}</p>
                <p className="text-sm text-muted-foreground">{e.en}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exercise {exerciseIndex + 1} of {topic.exercises.length}</CardTitle>
          <CardDescription>{topic.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <p className="font-medium text-foreground">{ex.prompt}</p>
            <RadioGroup value={selected ?? ''} onValueChange={(v) => { setSelected(v); setChecked(false); }}>
              {ex.options.map((opt) => (
                <div
                  key={opt}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5',
                    checked && opt === ex.answer && 'border-emerald-500 bg-emerald-500/5',
                    checked && selected === opt && opt !== ex.answer && 'border-rose-500 bg-rose-500/5',
                    !checked && 'hover:bg-accent/50'
                  )}
                >
                  <RadioGroupItem value={opt} id={`${topic.id}-${opt}`} disabled={checked} />
                  <Label htmlFor={`${topic.id}-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
                  {checked && opt === ex.answer ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                  {checked && selected === opt && opt !== ex.answer ? <XCircle className="h-4 w-4 text-rose-500" /> : null}
                </div>
              ))}
            </RadioGroup>
          </div>

          {checked ? (
            <div className={cn('flex gap-2 rounded-lg border p-3', isCorrect ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5')}>
              <Lightbulb className={cn('mt-0.5 h-4 w-4 shrink-0', isCorrect ? 'text-emerald-500' : 'text-amber-500')} />
              <p className="text-sm text-muted-foreground">{ex.explanation}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Difficulty: {topic.level}</p>
            {selected ? (
              checked ? (
                <Button onClick={next}>{isLast ? 'Back to topics' : 'Next exercise'}</Button>
              ) : (
                <Button onClick={() => setChecked(true)}>Check answer</Button>
              )
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
