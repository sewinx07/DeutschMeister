'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store/app-store';
import { SKILL_DESC, SKILL_LABELS, type SkillKey } from '@/types';
import { identifyWeakestSkill } from '@/lib/engine/adapt';
import { minutesBySkill, skillTrends } from '@/lib/engine/analytics';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Ear,
  Mic,
  PenLine,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const SKILL_ICONS: Record<SkillKey, React.ComponentType<{ className?: string }>> = {
  vocabulary: BookOpen,
  grammar: BookOpen,
  reading: BookOpen,
  listening: Ear,
  writing: PenLine,
  speaking: Mic,
};

const SKILL_HREFS: Record<SkillKey, string> = {
  vocabulary: '/vocabulary',
  grammar: '/grammar',
  reading: '/reading',
  listening: '/listening',
  writing: '/writing',
  speaking: '/speaking',
};

const SKILL_DESCRIPTIONS: Record<SkillKey, string> = {
  vocabulary: 'The words you know and can use. Reviewed with spaced repetition.',
  grammar: 'Sentence structure, cases, verb forms and connectors.',
  reading: 'Understanding written texts from emails to job postings.',
  listening: 'Understanding spoken German — news, dialogue, phone calls.',
  writing: 'Producing clear, correct German for letters and emails.',
  speaking: 'Confidence and fluency in spoken interaction.',
};

export default function SkillsPage() {
  const { db } = useApp();

  if (!db || !db.user) return null;

  const trends = skillTrends(db);
  const minutes = minutesBySkill(db);
  const weakest = identifyWeakestSkill(db.skills);
  const skills = (Object.keys(db.skills) as SkillKey[]).map((key) => db.skills[key]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Your skills"
        description="Six core exam skills. Your plan rebalances time toward the weakest ones every week."
      />

      <Card className="border-primary/40 bg-primary/[0.03]">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Focus this week: <span className="text-primary">{SKILL_LABELS[weakest]}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {SKILL_DESC[weakest]} is your weakest skill. Extra minutes have been added to your plan for it.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((state) => {
          const trend = trends.find((t) => t.skill === state.skill)!;
          const minutesCount = minutes.find((m) => m.skill === state.skill)?.minutes ?? 0;
          const Icon = SKILL_ICONS[state.skill];
          const change = trend.change;
          const isWeakest = state.skill === weakest;
          return (
            <Link key={state.skill} href={SKILL_HREFS[state.skill]} className="group">
              <Card className={cn('h-full transition-colors group-hover:border-primary/50', isWeakest && 'border-amber-400/50')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    {isWeakest ? <Badge variant="outline" className="border-amber-400/50 text-amber-600 dark:text-amber-400">Weakest</Badge> : null}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">{SKILL_LABELS[state.skill]}</p>
                      <span className="text-lg font-semibold tabular-nums text-foreground">{Math.round(state.score)}%</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{SKILL_DESC[state.skill]}</p>
                  </div>
                  <Progress value={state.score} className="mt-3 h-2" />
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{minutesCount} min practiced</span>
                    <span className={cn('flex items-center gap-1 font-medium', change > 0 ? 'text-emerald-600 dark:text-emerald-400' : change < 0 ? 'text-rose-600 dark:text-rose-400' : '')}>
                      {change > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : change < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                      {change > 0 ? `+${change}` : change}% this week
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How skills are measured</CardTitle>
          <CardDescription>Skill scores rise as you complete tasks, review words and take mock exams.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => (
              <div key={key} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {(() => {
                    const I = SKILL_ICONS[key];
                    return <I className="h-4 w-4" />;
                  })()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{SKILL_LABELS[key]}</p>
                  <p className="text-xs text-muted-foreground">{SKILL_DESCRIPTIONS[key]}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
