import { cn } from '@/lib/utils';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function Scalar({ value }: { value: unknown }) {
  if (typeof value === 'boolean') return <span>{value ? 'true' : 'false'}</span>;
  if (value === null) return <span className="text-sm text-muted-foreground">null</span>;
  return <span>{String(value)}</span>;
}

function Node({ value, depth }: { value: unknown; depth: number }) {
  if (depth > 4) return <span className="text-sm text-muted-foreground">…</span>;
  if (Array.isArray(value)) return <ListNode value={value} depth={depth} />;
  if (isObject(value)) return <ObjectNode value={value} depth={depth} />;
  return <Scalar value={value} />;
}

function ListNode({ value, depth }: { value: unknown[]; depth: number }) {
  if (value.length === 0) return <span className="text-sm text-muted-foreground">(empty list)</span>;
  const allStrings = value.every((item) => typeof item === 'string');
  if (allStrings) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {value.map((item, i) => (
          <li key={i} className="text-sm">
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={cn('space-y-2', depth > 0 && 'pl-3')}>
      {value.map((item, i) => (
        <li key={i} className="rounded-md border bg-background px-3 py-2">
          <Node value={item} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

const FIELD_LABELS: Record<string, string> = {
  heading: 'Heading',
  title: 'Title',
  body: 'Body',
  text: 'Text',
  prompt: 'Prompt',
  question: 'Question',
  choices: 'Choices',
  options: 'Options',
  answer: 'Answer',
  answers: 'Answers',
  correct: 'Correct answer',
  items: 'Items',
  examples: 'Examples',
  list: 'List',
  note: 'Note',
  tip: 'Tip',
};

function ObjectNode({ value, depth }: { value: Record<string, unknown>; depth: number }) {
  const heading = value.heading ?? value.title;
  const body = value.body ?? value.text;
  const prompt = value.prompt;
  const question = value.question;
  const choices = value.choices ?? value.options;
  const answers = value.answer ?? value.answers ?? value.correct;
  const items = value.items ?? value.examples ?? value.list;

  const known = [heading, body, prompt, question, choices, answers, items].filter((v) => v !== undefined);
  const remaining = Object.entries(value).filter(
    ([key, v]) =>
      !['heading', 'title', 'body', 'text', 'prompt', 'question', 'choices', 'options', 'answer', 'answers', 'correct', 'items', 'examples', 'list', 'note', 'tip'].includes(key) && v !== undefined,
  );

  if (known.length === 0 && remaining.length === 0) {
    return <span className="text-sm text-muted-foreground">(empty object)</span>;
  }

  return (
    <div className={cn('space-y-3', depth > 0 && '')}>
      {heading !== undefined && <h3 className="text-lg font-semibold leading-snug">{String(heading)}</h3>}
      {body !== undefined && <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{String(body)}</p>}
      {prompt !== undefined && (
        <div className="rounded-md border-l-4 border-primary bg-muted/50 px-4 py-3 text-sm leading-relaxed">
          {typeof prompt === 'string' ? prompt : <Node value={prompt} depth={depth + 1} />}
        </div>
      )}
      {question !== undefined && (
        <div className="space-y-1">
          <p className="text-sm font-semibold">Question</p>
          <p className="text-sm leading-relaxed">{typeof question === 'string' ? question : <Node value={question} depth={depth + 1} />}</p>
        </div>
      )}
      {choices !== undefined && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">Choices</p>
          <Node value={choices} depth={depth + 1} />
        </div>
      )}
      {answers !== undefined && (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <span className="uppercase tracking-wide text-xs">Answer · </span>
          {typeof answers === 'string' || typeof answers === 'number' ? String(answers) : <Node value={answers} depth={depth + 1} />}
        </p>
      )}
      {items !== undefined && <Node value={items} depth={depth + 1} />}
      {remaining.map(([key, v]) => (
        <div key={key} className="flex gap-2">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{FIELD_LABELS[key] ?? key}</span>
          <span className="min-w-0 text-sm">
            <Node value={v} depth={depth + 1} />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Read-only renderer for authored lesson `content`. Handles common content
 * shapes (heading/body, prompt, question/choices/answer, item lists) with a
 * generic key-value fallback for anything else. Directive-free so it can be
 * used both by client components (editor live preview) and server pages.
 */
export function LessonContent({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground">No content yet.</p>;
  }
  return <Node value={value} depth={0} />;
}
