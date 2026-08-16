'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignmentToggle } from '@/components/app/assignment-toggle';
import { AssignmentCreateForm, type AssignmentLessonOption } from '@/components/app/assignment-create-form';
import { deleteAssignment } from '@/lib/server/actions/assignments';
import type { AssignmentItem } from '@/lib/server/assignments';
import { toast } from 'sonner';

function AssignmentListItem({
  assignment,
  canManage,
}: {
  assignment: AssignmentItem;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const res = await deleteAssignment({ assignmentId: assignment.id });
      if (res.ok) {
        toast.success('Assignment deleted.');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <Link
          href={`/app/courses/${assignment.courseId}/lessons/${assignment.lessonId}`}
          className="text-sm font-medium underline-offset-2 hover:underline"
        >
          {assignment.lessonTitle}
        </Link>
        {assignment.note && <p className="truncate text-xs text-muted-foreground">{assignment.note}</p>}
        <p className={`text-xs ${assignment.isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
          {assignment.dueLabel}
        </p>
      </div>

      {canManage ? (
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-muted-foreground">
            {assignment.submittedCount}/{assignment.studentsCount} done
          </span>
          <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" onClick={onDelete} disabled={pending}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete assignment</span>
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3">
          {assignment.submittedCount < assignment.studentsCount && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {assignment.submittedCount}/{assignment.studentsCount} done
            </span>
          )}
          <AssignmentToggle assignmentId={assignment.id} done={assignment.submitted} />
        </div>
      )}
    </li>
  );
}

export function ClassAssignmentsPanel({
  classId,
  canManage,
  assignments,
  lessons,
}: {
  classId: string;
  canManage: boolean;
  assignments: AssignmentItem[];
  lessons: AssignmentLessonOption[];
}) {
  if (assignments.length === 0 && !canManage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assignments</CardTitle>
        <CardDescription>
          {canManage
            ? 'Assign course lessons to this class with a due date.'
            : `Homework for this class — ${assignments.length} assignment${assignments.length === 1 ? '' : 's'}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="rounded-lg border p-4">
            <AssignmentCreateForm classId={classId} lessons={lessons} />
          </div>
        )}

        {assignments.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" /> No assignments yet.
          </p>
        ) : (
          <ul className="divide-y">
            {assignments.map((a) => (
              <AssignmentListItem key={a.id} assignment={a} canManage={canManage} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
