'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createCourse } from '@/lib/server/actions/courses';
import { toast } from 'sonner';

export function CreateCourseForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.error('Title must be at least 2 characters.');
      return;
    }
    startTransition(async () => {
      const res = await createCourse({
        orgId,
        title: title.trim(),
        subject: subject.trim() || 'other',
        description: description.trim() || undefined,
        level: level.trim() || undefined,
      });
      if (res.ok) {
        toast.success('Course created.');
        setTitle('');
        setSubject('');
        setDescription('');
        setLevel('');
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
          <Label htmlFor="course-title">Title</Label>
          <Input
            id="course-title"
            placeholder="e.g. German A2 · Grammar Foundations"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="course-subject">Subject</Label>
          <Input
            id="course-subject"
            list="subject-options"
            placeholder="e.g. german"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={pending}
          />
          <datalist id="subject-options">
            {['german', 'english', 'math', 'science', 'programming', 'music', 'other'].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="course-level">Level</Label>
          <Input
            id="course-level"
            placeholder="e.g. A2"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="course-description">Description</Label>
        <Textarea
          id="course-description"
          placeholder="What will students learn?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          rows={2}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Creating…' : 'Create course'}
      </Button>
    </form>
  );
}
