'use client';

import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function tryParse(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  if (!text.trim()) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}

function PreviewValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (depth > 4) return <span className="text-xs text-muted-foreground">…</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-muted-foreground">(empty list)</span>;
    return (
      <ul className={cn('space-y-1', depth > 0 && 'pl-3')}>
        {value.map((item, i) => (
          <li key={i} className="text-sm">
            <PreviewValue value={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-xs text-muted-foreground">(empty object)</span>;
    return (
      <dl className={cn('grid gap-x-3 gap-y-1', depth === 0 ? 'sm:grid-cols-2' : '')}>
        {entries.map(([key, v]) => (
          <div key={key} className="flex gap-2">
            <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{key}</dt>
            <dd className="min-w-0 text-sm">
              <PreviewValue value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (typeof value === 'boolean') return <span>{value ? 'true' : 'false'}</span>;
  if (value === null) return <span className="text-xs text-muted-foreground">null</span>;
  return <span>{String(value)}</span>;
}

/**
 * JSON editor for lesson `content` with a live read-only preview of common
 * content shapes. The preview never mutates; the raw JSON text is what is saved.
 */
export function LessonContentEditor({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (text: string) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const id = useId();
  const parsed = tryParse(value);
  const jsonError = parsed.ok ? null : parsed.message;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Content (JSON)</Label>
      <Textarea
        id={id}
        rows={8}
        spellCheck={false}
        className="font-mono text-xs leading-relaxed"
        placeholder={'{\n  "heading": "…",\n  "body": "…",\n  "items": ["…"]\n}'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={jsonError ? true : undefined}
      />
      {jsonError ? (
        <p className="text-xs text-destructive">Invalid JSON: {jsonError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Live preview</p>
      )}
      {!jsonError && parsed.ok && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <PreviewValue value={parsed.value} />
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
