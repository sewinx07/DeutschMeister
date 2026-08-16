'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { enrollStudent, removeEnrollment } from '@/lib/server/actions/classes';
import { toast } from 'sonner';

export function RosterPanel({
  classId,
  enrolled,
  available,
  canManage,
  currentUserId,
}: {
  classId: string;
  enrolled: { id: string; name: string; email: string }[];
  available: { id: string; name: string; email: string }[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [pending, startTransition] = useTransition();

  function onEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    startTransition(async () => {
      const res = await enrollStudent({ classId, studentId });
      if (res.ok) {
        toast.success('Student enrolled.');
        setStudentId('');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  function onRemove(studentId: string, name: string) {
    startTransition(async () => {
      const res = await removeEnrollment({ classId, studentId });
      if (res.ok) {
        toast.success(`${name} removed from the class.`);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {enrolled.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {canManage ? 'No students enrolled yet.' : 'You are not enrolled in this class.'}
        </p>
      )}

      <ul className="divide-y">
        {enrolled.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {s.name}
                {s.id === currentUserId && <span className="text-muted-foreground"> (you)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{s.email}</p>
            </div>
            {canManage && s.id !== currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() => onRemove(s.id, s.name)}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canManage && available.length > 0 && (
        <form onSubmit={onEnroll} className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="enroll-student">Enroll a student</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={pending}>
              <SelectTrigger id="enroll-student">
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {available.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending || !studentId}>
            {pending ? 'Enrolling…' : 'Enroll'}
          </Button>
        </form>
      )}
    </div>
  );
}
