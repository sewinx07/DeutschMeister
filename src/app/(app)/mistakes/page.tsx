'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/lib/store/app-store';
import { formatDate } from '@/lib/db/storage';
import { mistakesByCategory } from '@/lib/engine/analytics';
import { MistakeCategory } from '@/types';
import { CheckCircle2, Lightbulb, Trash2, XCircle } from 'lucide-react';

const CATEGORY_LABELS: Record<MistakeCategory, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
  spelling: 'Spelling',
  articles: 'Articles',
  verbs: 'Verbs',
  cases: 'Cases',
  'word-order': 'Word order',
};

export default function MistakesPage() {
  const { db, markMistakeReviewed, deleteMistake } = useApp();
  const [tab, setTab] = useState('open');

  const categories = useMemo(() => (db ? mistakesByCategory(db) : []), [db]);

  if (!db) return null;

  const open = db.mistakes.filter((m) => !m.reviewed);
  const reviewed = db.mistakes.filter((m) => m.reviewed);
  const list = tab === 'open' ? open : reviewed;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mistake bank"
        description="Every mistake you make is collected here, tagged by category, and scheduled for review."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Open mistakes</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{open.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Reviewed</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{reviewed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Top category</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {categories[0] ? CATEGORY_LABELS[categories[0].category as MistakeCategory] ?? categories[0].category : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mistakes by category</CardTitle>
          <CardDescription>Where your errors cluster.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No mistakes recorded yet.</p>
            ) : (
              categories.map((c) => {
                const max = categories[0]?.count ?? 1;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm text-muted-foreground">
                      {CATEGORY_LABELS[c.category as MistakeCategory] ?? c.category}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                    <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">{c.count}</span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your mistakes</CardTitle>
              <CardDescription>Review and mark mistakes as learned.</CardDescription>
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-44 grid-cols-2">
                <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
                <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {tab === 'open' ? 'No open mistakes. Nice work!' : 'No reviewed mistakes yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {list.map((m) => (
                <div key={m.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{CATEGORY_LABELS[m.category] ?? m.category}</Badge>
                    {m.subcategory ? <Badge variant="outline">{m.subcategory}</Badge> : null}
                    <span className="ml-auto text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="flex items-start gap-2 rounded-lg bg-rose-500/5 p-3">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <span className="text-rose-700 dark:text-rose-300">{m.original}</span>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-emerald-500/5 p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-emerald-700 dark:text-emerald-300">{m.correct}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                    <span>{m.reason}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {!m.reviewed ? (
                      <Button size="sm" variant="outline" onClick={() => markMistakeReviewed(m.id)}>
                        Mark learned
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Reviewed {m.timesCorrect}×</span>
                    )}
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => deleteMistake(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
