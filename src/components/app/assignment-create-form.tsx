'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createAssignment } from '@/lib/server/actions/assignments';
import { toast } from 'sonner';

export type AssignmentLessonOption = {
  id: string;
  title: string;
  topicTitle: string;
  kind: string;
  minutes: number | null;
};

export function AssignmentCreateForm({
  classId,
  lessons,
}: {
  classId: string;
  lessons: AssignmentLessonOption[];
}) {
  const router = useRouter();
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lessonId) {
      toast.error('Choose a lesson to assign.');
      return;
    }
    if (!dueAt) {
      toast.error('Choose a due date.');
      return;
    }
    startTransition(async () => {
      const res = await createAssignment({
        classId,
        lessonId,
        dueAt,
        note: note.trim() || undefined,
      });
      if (res.ok) {
        toast.success('Assignment created.');
        setDueAt('');
        setNote('');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="assign-lesson">Lesson</Label>
          <Select value={lessonId} onValueChange={setLessonId} disabled={pending || lessons.length === 0}>
            <SelectTrigger id="assign-lesson">
              <SelectValue placeholder={lessons.length === 0 ? 'No lessons yet' : 'Choose a lesson'} />
            </SelectTrigger>
            <SelectContent>
              {lessons.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.topicTitle} — {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="assign-due">Due date</Label>
          <Input
            id="assign-due"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            disabled={pending}
            required
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="assign-note">Note</Label>
        <Textarea
          id="assign-note"
          placeholder="Optional instruction for the class"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={pending}
          rows={2}
        />
      </div>
      <Button type="submit" disabled={pending || lessons.length === 0} className="w-fit">
        {pending ? 'Creating…' : 'Assign lesson'}
      </Button>
    </form>
  );
}
