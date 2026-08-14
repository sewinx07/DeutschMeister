'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ComprehensionItem, Question } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Volume2, XCircle } from 'lucide-react';

export function speakGerman(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function ComprehensionExercise({
  items,
  onComplete,
}: {
  items: ComprehensionItem[];
  onComplete: (score: number, maxScore: number) => void;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');
  const active = items.find((i) => i.id === activeId) ?? items[0];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);

  if (!active) return null;

  const selected = active.questions.filter((q) => answers[q.id]);
  const allAnswered = selected.length === active.questions.length;
  const correct = active.questions.filter((q) => answers[q.id] === q.answer).length;

  const check = () => {
    setRevealed(true);
    onComplete(correct, active.questions.length);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveId(item.id);
              setAnswers({});
              setRevealed(false);
            }}
            className={cn(
              'w-full rounded-xl border p-4 text-left transition-colors',
              item.id === activeId
                ? 'border-primary/60 bg-primary/[0.04]'
                : 'border-border hover:bg-accent/50'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground">{item.title}</p>
              <Badge variant="secondary">{item.level}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.category} · {item.durationMinutes} min · {item.questions.length} questions
            </p>
          </button>
        ))}
      </div>

      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{active.title}</CardTitle>
            <CardDescription>{active.category} · {active.level}</CardDescription>
          </div>
          {active.useSpeech ? (
            <Button variant="outline" size="sm" onClick={() => speakGerman(active.text)}>
              <Volume2 className="mr-2 h-4 w-4" /> Listen
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5">
          {active.kind === 'reading' ? (
            <ScrollArea className="h-44 rounded-lg border p-4">
              <p className="text-sm leading-relaxed text-foreground">{active.text}</p>
            </ScrollArea>
          ) : (
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                You&apos;ll hear: tap &quot;Listen&quot; to play (German text-to-speech)
              </p>
            </div>
          )}

          {active.vocab.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {active.vocab.map((v) => (
                <span key={v.de} className="rounded-full border px-3 py-1 text-xs">
                  <span className="font-medium text-foreground">{v.de}</span>
                  <span className="text-muted-foreground"> — {v.en}</span>
                </span>
              ))}
            </div>
          ) : null}

          <div className="space-y-4">
            {active.questions.map((q, qi) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={qi}
                value={answers[q.id] ?? ''}
                revealed={revealed}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {correct} of {active.questions.length} correct{revealed ? '' : ' — answer all to check'}
            </p>
            {!revealed ? (
              <Button onClick={check} disabled={!allAnswered}>
                Check answers
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant={correct === active.questions.length ? 'secondary' : 'outline'}>
                  Score {correct}/{active.questions.length}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionRow({
  question,
  index,
  value,
  revealed,
  onChange,
}: {
  question: Question;
  index: number;
  value: string;
  revealed: boolean;
  onChange: (v: string) => void;
}) {
  const isCorrect = value === question.answer;
  return (
    <div className="rounded-xl border p-4">
      <p className="mb-3 text-sm font-medium text-foreground">
        {index + 1}. {question.prompt}
      </p>
      {question.options?.length ? (
        <RadioGroup value={value} onValueChange={onChange}>
          {question.options.map((opt) => (
            <div
              key={opt}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                revealed && opt === question.answer && 'border-emerald-500 bg-emerald-500/5',
                revealed && value === opt && opt !== question.answer && 'border-rose-500 bg-rose-500/5',
                !revealed && 'hover:bg-accent/50'
              )}
            >
              <RadioGroupItem value={opt} id={`${question.id}-${opt}`} disabled={revealed} />
              <Label htmlFor={`${question.id}-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
              {revealed && opt === question.answer ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
              {revealed && value === opt && opt !== question.answer ? <XCircle className="h-4 w-4 text-rose-500" /> : null}
            </div>
          ))}
        </RadioGroup>
      ) : (
        <p className="text-sm text-muted-foreground">Short answer: {question.answer}</p>
      )}
      {revealed ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {isCorrect ? 'Correct! ' : 'Not quite. '}
          {question.explanation}
        </p>
      ) : null}
    </div>
  );
}
