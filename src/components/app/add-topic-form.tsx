'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTopic } from '@/lib/server/actions/courses';
import { toast } from 'sonner';

export function AddTopicForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTopic({ courseId, title: title.trim() });
      if (res.ok) {
        toast.success('Topic added.');
        setTitle('');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="topic-title">New topic</Label>
        <Input
          id="topic-title"
          placeholder="e.g. Introductions & greetings"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add topic'}
      </Button>
    </form>
  );
}
