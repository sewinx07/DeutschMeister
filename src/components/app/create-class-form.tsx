'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { createClass } from '@/lib/server/actions/classes';
import { toast } from 'sonner';

export function CreateClassForm({
  orgId,
  courses,
  teachers,
}: {
  orgId: string;
  courses: { id: string; title: string }[];
  teachers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [teacherId, setTeacherId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) {
      toast.error('Choose a course for this class.');
      return;
    }
    startTransition(async () => {
      const res = await createClass({
        orgId,
        courseId,
        teacherId: teacherId || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      if (res.ok) {
        toast.success('Class created.');
        setName('');
        setDescription('');
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
          <Label htmlFor="class-name">Class name</Label>
          <Input
            id="class-name"
            placeholder="e.g. German A2 · Morning group"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="class-course">Course</Label>
          <Select value={courseId} onValueChange={setCourseId} disabled={pending || courses.length === 0}>
            <SelectTrigger id="class-course">
              <SelectValue placeholder={courses.length === 0 ? 'No courses yet' : 'Choose a course'} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="class-teacher">Teacher</Label>
          <Select value={teacherId} onValueChange={setTeacherId} disabled={pending || teachers.length === 0}>
            <SelectTrigger id="class-teacher">
              <SelectValue placeholder={teachers.length === 0 ? 'No teachers' : 'Optional'} />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="class-description">Description</Label>
        <Textarea
          id="class-description"
          placeholder="Optional note for this group"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          rows={2}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Creating…' : 'Create class'}
      </Button>
    </form>
  );
}
