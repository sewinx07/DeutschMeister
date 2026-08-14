'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/lib/store/app-store';
import { dueWords, getLearningQueue, isDue, type ReviewRating } from '@/lib/engine/srs';
import { vocabularyStats } from '@/lib/engine/analytics';
import { VocabularyWord } from '@/types';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Check,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from 'lucide-react';

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  window.speechSynthesis.speak(u);
}

export default function VocabularyPage() {
  const { db, reviewWord, addNewWord } = useApp();
  const [queue, setQueue] = useState<VocabularyWord[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const stats = useMemo(() => (db ? vocabularyStats(db) : null), [db]);
  const avgFamiliarity = db
    ? db.vocabulary.length
      ? Math.round((db.vocabulary.reduce((a, w) => a + w.familiarity, 0) / db.vocabulary.length) * 100)
      : 0
    : 0;

  if (!db || !stats) return null;

  const due = dueWords(db.vocabulary);
  const queueNow = queue.length > 0 ? queue : due.length > 0 ? due : getLearningQueue(db.vocabulary, 10);
  const current = queueNow[index];
  const masteredCount = db.vocabulary.filter((w) => w.mastered).length;

  const startSession = () => {
    setQueue(getLearningQueue(db.vocabulary, 12));
    setIndex(0);
    setRevealed(false);
    setSessionDone(false);
  };

  const rate = (rating: ReviewRating) => {
    if (!current) return;
    reviewWord(current.id, rating);
    if (index + 1 < queueNow.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      setSessionDone(true);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vocabulary"
        description="Spaced-repetition flashcards for exam-relevant German — every review schedules the next one."
        actions={
          <Button variant="outline" onClick={addNewWord}>
            <Sparkles className="mr-2 h-4 w-4" /> Add a word
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total words" value={db.vocabulary.length} />
        <Stat label="Mastered" value={masteredCount} />
        <Stat label="Due for review" value={due.length} />
        <Stat label="Avg familiarity" value={`${avgFamiliarity}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Review session</CardTitle>
            <CardDescription>
              {sessionDone
                ? 'Session complete.'
                : queueNow.length
                ? `${index + 1} of ${queueNow.length} · rate how well you knew each word`
                : 'All caught up. Start a session to practice.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {sessionDone ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-8 w-8" />
                </div>
                <p className="font-medium text-foreground">Session complete!</p>
                <p className="text-sm text-muted-foreground">You reviewed {queueNow.length} words. Keep it up.</p>
                <Button onClick={startSession}><RotateCcw className="mr-2 h-4 w-4" /> Start another</Button>
              </div>
            ) : current ? (
              <>
                <button
                  type="button"
                  onClick={() => setRevealed(!revealed)}
                  className="flex w-full flex-col items-center gap-3 rounded-xl border p-8 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-foreground">
                      {current.article} {current.german}
                    </span>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); speak(`${current.article} ${current.german}`); }}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {current.plural ? <span className="text-sm text-muted-foreground">{current.plural}</span> : null}
                  {!revealed ? (
                    <p className="text-sm text-muted-foreground">Tap to reveal the answer</p>
                  ) : (
                    <div className="mt-2 space-y-2 text-center">
                      <p className="text-lg font-medium text-primary">{current.english}</p>
                      <p className="text-sm text-muted-foreground">{current.example}</p>
                      <Badge variant="secondary">{current.category}</Badge>
                    </div>
                  )}
                </button>

                {revealed ? (
                  <div className="mt-6 grid w-full grid-cols-4 gap-2">
                    <RateButton label="Again" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400" onClick={() => rate('again')} />
                    <RateButton label="Hard" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400" onClick={() => rate('hard')} />
                    <RateButton label="Good" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400" onClick={() => rate('good')} />
                    <RateButton label="Easy" className="bg-primary/10 text-primary hover:bg-primary/20" onClick={() => rate('easy')} />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No words to review right now.</p>
                <Button onClick={startSession}>Start session</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All words</CardTitle>
            <CardDescription>Browse and review every word.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="due">Due</TabsTrigger>
                <TabsTrigger value="mastered">Mastered</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <WordList words={db.vocabulary} speak={speak} />
              </TabsContent>
              <TabsContent value="due">
                <WordList words={dueWords(db.vocabulary, 50)} speak={speak} />
              </TabsContent>
              <TabsContent value="mastered">
                <WordList words={db.vocabulary.filter((w) => w.mastered)} speak={speak} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function RateButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <Button variant="ghost" className={cn('font-medium', className)} onClick={onClick}>
      {label}
    </Button>
  );
}

function WordList({ words, speak }: { words: VocabularyWord[]; speak: (t: string) => void }) {
  if (words.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No words here.</p>;
  return (
    <div className="space-y-1.5">
      {words.map((w) => (
        <div key={w.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {w.article} {w.german}
              {w.plural ? <span className="text-muted-foreground"> · {w.plural}</span> : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">{w.english}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Progress value={w.familiarity * 100} className="h-1.5 w-12" />
            {w.mastered ? <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" /> : !isDue(w) ? <ThumbsDown className="h-3.5 w-3.5 text-amber-500" /> : null}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => speak(`${w.article} ${w.german}`)}>
              <Volume2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
