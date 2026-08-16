'use client';

import { useId } from 'react';
import { LessonContent } from '@/components/app/lesson-content';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function tryParse(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  if (!text.trim()) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Invalid JSON' };
  }
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
          <LessonContent value={parsed.value} />
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
