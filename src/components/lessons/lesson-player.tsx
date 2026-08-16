'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/lib/store/app-store';
import { GrammarDetail } from '@/components/app/grammar-detail';
import { ComprehensionExercise } from '@/components/shared/comprehension';
import { analyzeWriting } from '@/lib/ai/writing';
import { analyzeSpeaking, SpeakingInput } from '@/lib/ai/speaking';
import type { WritingAnalysis, SpeakingAnalysis } from '@/lib/ai/schemas';
import type {
  ComprehensionItem,
  Database,
  GrammarTopic,
  MistakeCategory,
  SpeakingFeedback,
  StudyTask,
} from '@/types';
import { CheckCircle2, Clock, Link2 } from 'lucide-react';

export function LessonPlayer({ task }: { task: StudyTask }) {
  const { db, completeTask } = useApp();
  const router = useRouter();
  const [result, setResult] = useState<{ score?: number } | null>(null);

  if (!db) return null;

  const back = () => router.push('/plan');
  const finish = (score?: number) => {
    completeTask(task.id, score);
    setResult({ score });
  };

  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <CardTitle>Lesson completed</CardTitle>
            <CardDescription>
              {task.title}
              {typeof result.score === 'number' ? ` — score ${result.score}/100` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={back}>Back to plan</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={back}>← Plan</Button>
        <Badge>{task.type}</Badge>
        <Badge variant="outline">{task.skill}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {task.durationMinutes} min
        </span>
      </div>

      <LessonBody task={task} db={db} onComplete={finish} />
    </div>
  );
}

function LessonBody({
  task,
  db,
  onComplete,
}: {
  task: StudyTask;
  db: Database;
  onComplete: (score?: number) => void;
}) {
  switch (task.type) {
    case 'grammar':
      return <GrammarBody task={task} db={db} onComplete={onComplete} />;
    case 'listening':
    case 'reading':
      return <ComprehensionBody task={task} db={db} onComplete={onComplete} />;
    case 'writing':
      return <WritingBody task={task} db={db} onComplete={onComplete} />;
    case 'speaking':
      return <SpeakingBody task={task} db={db} onComplete={onComplete} />;
    case 'mock_exam':
      return <MockBody task={task} db={db} onComplete={onComplete} />;
    case 'vocabulary':
      return <VocabularyBody db={db} onComplete={onComplete} />;
    case 'review':
      return <ReviewBody db={db} onComplete={onComplete} />;
    case 'mistakes':
      return <MistakesBody db={db} onComplete={onComplete} />;
    default:
      return <RestBody task={task} onComplete={onComplete} />;
  }
}

function resolveItem<T extends { id: string }>(pool: T[], sourceId: string | undefined): T | undefined {
  if (sourceId) return pool.find((i) => i.id === sourceId) ?? pool[0];
  return pool[0];
}

function GrammarBody({
  task,
  db,
  onComplete,
}: {
  task: StudyTask;
  db: Database;
  onComplete: (score?: number) => void;
}) {
  const { addMistake } = useApp();
  const topic: GrammarTopic | undefined = task.sourceId
    ? db.grammar.find((g) => g.id === task.sourceId) ?? db.grammar[0]
    : db.grammar[0];

  if (!topic) {
    return (
      <SimpleCard
        title="Grammar"
        description="No grammar topics available yet."
        action={<MarkDone onComplete={() => onComplete(0)} />}
      />
    );
  }

  return (
    <GrammarDetail
      topic={topic}
      backLabel="Plan"
      onBack={() => onComplete(0)}
      onComplete={(r) => {
        r.mistakes.slice(0, 3).forEach((m) => {
          addMistake({
            category: 'grammar',
            original: m.original,
            correct: m.correct,
            reason: m.reason,
            reviewDate: new Date().toISOString(),
          });
        });
        onComplete(Math.round((r.score / r.maxScore) * 100));
      }}
    />
  );
}

function ComprehensionBody({
  task,
  db,
  onComplete,
}: {
  task: StudyTask;
  db: Database;
  onComplete: (score?: number) => void;
}) {
  const pool = task.type === 'listening' ? db.exercises.listening : db.exercises.reading;
  const item = resolveItem<ComprehensionItem>(pool, task.sourceId);

  if (!item) {
    return (
      <SimpleCard
        title={task.type === 'listening' ? 'Listening' : 'Reading'}
        description="No exercises available yet."
        action={<MarkDone onComplete={() => onComplete(0)} />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>{item.category} · {item.level}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{item.text}</p>
        </CardContent>
      </Card>
      <ComprehensionExercise
        items={[item]}
        onComplete={(score, maxScore) => onComplete(Math.round((score / maxScore) * 100))}
      />
    </div>
  );
}

function WritingBody({
  task,
  db,
  onComplete,
}: {
  task: StudyTask;
  db: Database;
  onComplete: (score?: number) => void;
}) {
  const { logStudySession, addMistake } = useApp();
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);

  const prompt = task.sourceId
    ? db.writingPrompts.find((p) => p.id === task.sourceId) ?? db.writingPrompts[0]
    : db.writingPrompts[0];

  if (!prompt) {
    return (
      <SimpleCard
        title="Writing"
        description="No writing prompts available yet."
        action={<MarkDone onComplete={() => onComplete(0)} />}
      />
    );
  }

  const words = (text.match(/[a-zäöüß]+/gi) || []).length;
  const submit = () => {
    const result = analyzeWriting(text);
    setAnalysis(result);
    logStudySession({ skill: 'writing', minutes: task.durationMinutes, score: result.score, source: prompt.title });
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
    onComplete(result.score);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{prompt.title}</CardTitle>
        <CardDescription>{prompt.situation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium text-foreground">{prompt.task}</p>
        <div className="flex flex-wrap gap-2">
          {prompt.requirements.map((r) => (
            <Badge key={r} variant="secondary">{r}</Badge>
          ))}
        </div>
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your answer here…"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {words} words · min {prompt.minWords}
          </p>
          <Button onClick={submit} disabled={words < 10}>Check & finish</Button>
        </div>
        {analysis ? <WritingFeedback analysis={analysis} /> : null}
      </CardContent>
    </Card>
  );
}

function WritingFeedback({ analysis }: { analysis: WritingAnalysis }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Score: {analysis.score}/100</p>
      {analysis.mistakes.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {analysis.mistakes.map((m, i) => (
            <li key={i}>
              <span className="text-rose-500 line-through">{m.original}</span>
              <span className="mx-1">→</span>
              <span className="text-emerald-500">{m.corrected}</span>
              <p className="text-xs text-muted-foreground">{m.explanation}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-emerald-500">No issues detected.</p>
      )}
      <ul className="list-disc pl-5 text-sm text-muted-foreground">
        {analysis.strengths.slice(0, 3).map((s) => <li key={s}>{s}</li>)}
      </ul>
    </div>
  );
}

function SpeakingBody({
  task,
  db,
  onComplete,
}: {
  task: StudyTask;
  db: Database;
  onComplete: (score?: number) => void;
}) {
  const { saveSpeakingSession, logStudySession, addMistake } = useApp();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<SpeakingAnalysis | null>(null);

  const prompt = task.sourceId
    ? db.speakingPrompts.find((p) => p.id === task.sourceId) ?? db.speakingPrompts[0]
    : db.speakingPrompts[0];

  if (!prompt) {
    return (
      <SimpleCard
        title="Speaking"
        description="No speaking prompts available yet."
        action={<MarkDone onComplete={() => onComplete(0)} />}
      />
    );
  }

  const answered = Object.values(answers).filter((a) => a.trim().length > 0).length;
  const submit = () => {
    const input: SpeakingInput = {
      answers: prompt.questions.map((q) => ({ question: q, answer: answers[q] ?? '' })),
      durationMinutes: prompt.durationMinutes,
    };
    const result = analyzeSpeaking(input);
    setAnalysis(result);

    const now = new Date().toISOString();
    const feedbackMistakes = result.mistakes.map((m, i) => ({
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
      promptId: prompt.id,
      level: prompt.level,
      date: now,
      answers: input.answers,
      feedback,
      durationMinutes: prompt.durationMinutes,
    });
    logStudySession({ skill: 'speaking', minutes: prompt.durationMinutes, score: result.fluency, source: prompt.title });
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
    onComplete(result.fluency);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{prompt.title}</CardTitle>
        <CardDescription>{prompt.situation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {prompt.questions.map((q, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">{i + 1}. {q}</p>
              <Textarea
                rows={2}
                value={answers[q] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q]: e.target.value }))}
                placeholder="Deine Antwort…"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{answered}/{prompt.questions.length} answered</p>
          <Button onClick={submit} disabled={answered === 0}>Analyze & finish</Button>
        </div>
        {analysis ? (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Fluency: {analysis.fluency} · Grammar: {analysis.grammar} · Vocabulary: {analysis.vocabulary}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {analysis.strengths.slice(0, 3).map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MockBody({
  task,
  db,
  onComplete,
}: {
  task: StudyTask;
  db: Database;
  onComplete: (score?: number) => void;
}) {
  const template = task.sourceId
    ? db.mockExams.find((m) => m.id === task.sourceId) ?? db.mockExams[0]
    : db.mockExams[0];

  if (!template) {
    return (
      <SimpleCard
        title="Mock exam"
        description="No mock exams available yet."
        action={<MarkDone onComplete={() => onComplete()} />}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{template.level}</Badge>
          <Badge variant="outline">{template.examType}</Badge>
          <Badge variant="secondary">{template.durationMinutes} min</Badge>
        </div>
        <ul className="space-y-1.5 text-sm">
          {template.sections.map((s) => (
            <li key={s.id} className="flex justify-between rounded-lg border px-3 py-2">
              <span className="font-medium text-foreground">{s.name}</span>
              <span className="text-muted-foreground">{s.durationMinutes} min · {s.items.length} items</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/mock-exams"><Link2 className="mr-2 h-4 w-4" /> Open mock exam runner</Link>
          </Button>
          <MarkDone onComplete={() => onComplete()} />
        </div>
      </CardContent>
    </Card>
  );
}

function VocabularyBody({ db, onComplete }: { db: Database; onComplete: (score?: number) => void }) {
  const due = db.vocabulary.filter((w) => !w.mastered && new Date(w.dueAt) <= new Date()).length;
  return (
    <SimpleCard
      title="Vocabulary review"
      description={`${due} words due for review · ${db.vocabulary.filter((w) => w.mastered).length} mastered.`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/vocabulary"><Link2 className="mr-2 h-4 w-4" /> Open vocabulary</Link>
          </Button>
          <MarkDone onComplete={() => onComplete()} />
        </div>
      }
    />
  );
}

function ReviewBody({ db, onComplete }: { db: Database; onComplete: (score?: number) => void }) {
  const due = db.vocabulary.filter((w) => !w.mastered && new Date(w.dueAt) <= new Date()).length;
  return (
    <SimpleCard
      title="Review"
      description={`${due} words due for review. Keep the streak going.`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/vocabulary"><Link2 className="mr-2 h-4 w-4" /> Open vocabulary</Link>
          </Button>
          <MarkDone onComplete={() => onComplete()} />
        </div>
      }
    />
  );
}

function MistakesBody({ db, onComplete }: { db: Database; onComplete: (score?: number) => void }) {
  const { markMistakeReviewed } = useApp();
  const due = db.mistakes.filter((m) => !m.reviewed && new Date(m.reviewDate) <= new Date()).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mistake review</CardTitle>
        <CardDescription>{due.length} mistakes to review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {due.length === 0 ? (
          <p className="text-sm text-muted-foreground">No mistakes due right now.</p>
        ) : (
          <ul className="space-y-2">
            {due.map((m) => (
              <li key={m.id} className="rounded-lg border p-3">
                <p className="text-sm">
                  <span className="line-through text-rose-500">{m.original}</span>
                  <span className="mx-1">→</span>
                  <span className="text-emerald-500">{m.correct}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{m.reason}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {due.slice(0, 3).map((m) => (
            <Button key={m.id} variant="outline" size="sm" onClick={() => markMistakeReviewed(m.id)}>
              Got it — {m.original}
            </Button>
          ))}
          <MarkDone onComplete={() => onComplete()} />
        </div>
      </CardContent>
    </Card>
  );
}

function RestBody({ task, onComplete }: { task: StudyTask; onComplete: (score?: number) => void }) {
  return (
    <SimpleCard
      title={task.title}
      description={task.description ?? 'Recovery day.'}
      action={<MarkDone onComplete={() => onComplete()} />}
    />
  );
}

function SimpleCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{action}</CardContent>
    </Card>
  );
}

function MarkDone({ onComplete }: { onComplete: () => void }) {
  return <Button onClick={onComplete}>Mark as done</Button>;
}
