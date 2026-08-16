'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store/app-store';
import { GrammarDetail } from '@/components/app/grammar-detail';

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

