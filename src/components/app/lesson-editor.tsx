'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LessonContentEditor } from '@/components/app/lesson-content-editor';
import { deleteLesson, moveLesson, updateLesson } from '@/lib/server/actions/courses';
import { toast } from 'sonner';

const KINDS = ['vocabulary', 'grammar', 'listening', 'reading', 'writing', 'speaking', 'exam'];

export function LessonEditor({
  lesson,
  canMoveUp,
  canMoveDown,
}: {
  lesson: { id: string; title: string; kind: string; minutes: number | null; content: unknown };
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [kind, setKind] = useState(lesson.kind);
  const [minutes, setMinutes] = useState(lesson.minutes ? String(lesson.minutes) : '');
  const [contentText, setContentText] = useState(JSON.stringify(lesson.content ?? {}, null, 2));
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    let content: Record<string, unknown> | null;
    try {
      content = contentText.trim() ? (JSON.parse(contentText) as Record<string, unknown>) : null;
    } catch {
      toast.error('Content is not valid JSON.');
      return;
    }
    startTransition(async () => {
      const res = await updateLesson({
        lessonId: lesson.id,
        title: title.trim(),
        kind,
        minutes: minutes ? Number(minutes) : undefined,
        content,
      });
      if (res.ok) {
        toast.success('Lesson updated.');
        setEditing(false);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  function onMove(direction: 'up' | 'down') {
    startTransition(async () => {
      const res = await moveLesson({ lessonId: lesson.id, direction });
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  function onDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteLesson({ lessonId: lesson.id });
      if (res.ok) {
        toast.success('Lesson deleted.');
        router.refresh();
      } else {
        toast.error(res.error.message);
        setConfirming(false);
      }
    });
  }

  if (editing) {
    return (
      <form onSubmit={onSave} className="space-y-3 rounded-lg border p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_150px_100px]">
          <div className="grid gap-1.5">
            <Label htmlFor={`lesson-title-${lesson.id}`}>Lesson title</Label>
            <Input
              id={`lesson-title-${lesson.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`lesson-kind-${lesson.id}`}>Kind</Label>
            <Select value={kind} onValueChange={setKind} disabled={pending}>
              <SelectTrigger id={`lesson-kind-${lesson.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`lesson-minutes-${lesson.id}`}>Minutes</Label>
            <Input
              id={`lesson-minutes-${lesson.id}`}
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <LessonContentEditor value={contentText} onChange={setContentText} disabled={pending} />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit lesson">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canMoveUp || pending}
        onClick={() => onMove('up')}
        aria-label="Move lesson up"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canMoveDown || pending}
        onClick={() => onMove('down')}
        aria-label="Move lesson down"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={confirming ? 'text-destructive' : ''}
        onClick={onDelete}
        disabled={pending}
      >
        {confirming ? (
          <>
            <X className="mr-1 h-4 w-4" /> Delete lesson?
          </>
        ) : (
          <>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </>
        )}
      </Button>
    </div>
  );
}
