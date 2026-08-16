'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { GrammarTopic } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';

export interface GrammarMistake {
  original: string;
  correct: string;
  reason: string;
}

export function GrammarDetail({
  topic,
  onBack,
  onComplete,
  backLabel = 'All topics',
}: {
  topic: GrammarTopic;
  onBack: () => void;
  /** Fired after the last exercise when the lesson is finished. */
  onComplete?: (result: { score: number; maxScore: number; mistakes: GrammarMistake[] }) => void;
  backLabel?: string;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const mistakes = useRef<GrammarMistake[]>([]);

  const ex = topic.exercises[exerciseIndex];
  const isLast = exerciseIndex === topic.exercises.length - 1;
  const isCorrect = selected === ex.answer;

  const checkAnswer = () => {
    if (selected === ex.answer) {
      setCorrect((c) => c + 1);
    } else {
      mistakes.current.push({ original: selected ?? '', correct: ex.answer, reason: ex.explanation });
    }
    setChecked(true);
  };

  const next = () => {
    setSelected(null);
    setChecked(false);
    if (isLast) {
      if (onComplete) {
        onComplete({ score: correct, maxScore: topic.exercises.length, mistakes: mistakes.current });
      } else {
        onBack();
      }
    } else {
      setExerciseIndex((i) => i + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← {backLabel}</Button>
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
                <Button onClick={next}>{isLast ? (onComplete ? 'Finish lesson' : 'Back to topics') : 'Next exercise'}</Button>
              ) : (
                <Button onClick={checkAnswer}>Check answer</Button>
              )
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
