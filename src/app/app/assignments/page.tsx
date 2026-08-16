import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AssignmentToggle } from '@/components/app/assignment-toggle';
import { loadAssignmentsForUser } from '@/lib/server/assignments';
import { requireOrgContext } from '@/lib/server/org-context';
import { roleHasPermission } from '@/lib/server/rbac';
import { Role } from '@/generated/prisma/enums';

export const metadata = {
  title: 'Assignments',
};

export default async function AssignmentsPage() {
  const ctx = await requireOrgContext();
  const canManageAll = roleHasPermission(ctx.role, 'class.manage');
  const isTeacher = ctx.role === Role.TEACHER;
  const scope = canManageAll ? 'org' : isTeacher ? 'teaching' : 'enrolled';

  const assignments = await loadAssignmentsForUser(ctx.org.id, ctx.user.id, scope);
  const canToggle = scope === 'enrolled';
  const open = assignments.filter((a) => !a.submitted && !a.isOverdue).length;
  const done = assignments.filter((a) => a.submitted).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">
          {canToggle
            ? `${open} open · ${done} done · across your classes`
            : `${assignments.length} total · across ${new Set(assignments.map((a) => a.classId)).size} classes`}
        </p>
      </header>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {canToggle ? 'No assignments for your classes yet.' : 'No assignments yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {assignments.map((a) => {
            const overdue = !a.submitted && a.isOverdue;
            return (
              <li key={a.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/courses/${a.courseId}/lessons/${a.lessonId}`}
                          className="text-sm font-medium underline-offset-2 hover:underline"
                        >
                          {a.lessonTitle}
                        </Link>
                        <Badge variant="outline">{a.className}</Badge>
                        <Badge variant="secondary">{a.lessonKind}</Badge>
                      </div>
                      {a.note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.note}</p>}
                      <p className={`mt-0.5 text-xs ${overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                        {a.dueLabel}
                        {a.assignedByName ? ` · assigned by ${a.assignedByName}` : ''}
                      </p>
                    </div>

                    {canToggle ? (
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {a.submittedCount}/{a.studentsCount} done
                        </span>
                        <AssignmentToggle assignmentId={a.id} done={a.submitted} />
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={a.submittedCount >= a.studentsCount ? 'secondary' : 'outline'}>
                          {a.submittedCount}/{a.studentsCount} done
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
