'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useApp } from '@/lib/store/app-store';
import { ComprehensionExercise } from '@/components/shared/comprehension';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export default function ReadingPage() {
  const { db, logStudySession } = useApp();
  const items = useMemo(() => db?.exercises.reading ?? [], [db]);
  const [lastResult, setLastResult] = useState<{ score: number; max: number } | null>(null);
  const [completed, setCompleted] = useState(0);

  if (!db) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reading"
        description="Lesen — understand real German texts: announcements, emails, job postings."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-4.5 w-4.5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Texts</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><CheckCircle2 className="h-4.5 w-4.5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-4.5 w-4.5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Last score</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">
                  {lastResult ? `${Math.round((lastResult.score / lastResult.max) * 100)}%` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ComprehensionExercise
        items={items}
        onComplete={(score, max) => {
          setLastResult({ score, max });
          setCompleted((c) => c + 1);
          logStudySession({ skill: 'reading', minutes: 5, score: Math.round((score / max) * 100), source: 'Reading exercise' });
        }}
      />
    </div>
  );
}
