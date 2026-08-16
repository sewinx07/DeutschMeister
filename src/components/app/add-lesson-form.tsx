'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { createLesson } from '@/lib/server/actions/courses';
import { toast } from 'sonner';

const KINDS = ['vocabulary', 'grammar', 'listening', 'reading', 'writing', 'speaking', 'exam'];

export function AddLessonForm({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('vocabulary');
  const [minutes, setMinutes] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createLesson({
        topicId,
        title: title.trim(),
        kind,
        minutes: minutes ? Number(minutes) : undefined,
      });
      if (res.ok) {
        toast.success('Lesson added.');
        setTitle('');
        setMinutes('');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        + Add lesson
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_160px_110px]">
        <div className="grid gap-1.5">
          <Label htmlFor={`lesson-title-${topicId}`}>Lesson title</Label>
          <Input
            id={`lesson-title-${topicId}`}
            placeholder="e.g. Vocabulary: formal greetings"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`lesson-kind-${topicId}`}>Kind</Label>
          <Select value={kind} onValueChange={setKind} disabled={pending}>
            <SelectTrigger id={`lesson-kind-${topicId}`}>
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
          <Label htmlFor={`lesson-minutes-${topicId}`}>Minutes</Label>
          <Input
            id={`lesson-minutes-${topicId}`}
            type="number"
            min={1}
            max={600}
            placeholder="30"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Add lesson'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
