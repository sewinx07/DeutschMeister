import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { RosterPanel } from '@/components/app/roster-panel';
import { ClassAssignmentsPanel } from '@/components/app/class-assignments-panel';
import { loadClassAssignments, loadCourseLessonsForClass } from '@/lib/server/assignments';
import { requireOrgContext } from '@/lib/server/org-context';
import { roleHasPermission } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';
import { MembershipStatus, Role } from '@/generated/prisma/enums';

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();

  const klass = await prisma.class.findFirst({
    where: { id, orgId: ctx.org.id },
    include: {
      course: { select: { id: true, title: true, subject: true, level: true, published: true } },
      teacher: { select: { id: true, name: true } },
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { enrolledAt: 'asc' },
      },
    },
  });

  if (!klass) notFound();

  const enrolledIds = new Set(klass.enrollments.map((e) => e.studentId));
  const canManage =
    roleHasPermission(ctx.role, 'class.manage') || klass.teacherId === ctx.user.id;
  const isStudent = !canManage;

  const availableStudents = isStudent
    ? []
    : await prisma.organizationMember.findMany({
        where: {
          orgId: ctx.org.id,
          status: MembershipStatus.ACTIVE,
          role: Role.STUDENT,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });

  const [assignments, courseLessons] = await Promise.all([
    loadClassAssignments(ctx.org.id, klass.id, ctx.user.id),
    canManage ? loadCourseLessonsForClass(ctx.org.id, klass.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/app/classes">
          <ChevronLeft className="mr-1 h-4 w-4" /> All classes
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{klass.course.subject}</Badge>
          {klass.course.level && <Badge variant="secondary">{klass.course.level}</Badge>}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{klass.name}</h1>
        <p className="max-w-2xl text-muted-foreground">
          <Link href={`/app/courses/${klass.course.id}`} className="underline underline-offset-2 hover:text-foreground">
            {klass.course.title}
          </Link>
          {klass.teacher ? ` · ${klass.teacher.name}` : ''}
        </p>
        {canManage && (
          <Button asChild size="sm">
            <Link href={`/app/classes/${id}/progress`}>View progress</Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
          <CardDescription>
            {klass.enrollments.length} enrolled ·{' '}
            {canManage ? 'manage students below' : 'student view'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RosterPanel
            classId={klass.id}
            enrolled={klass.enrollments.map((e) => ({
              id: e.student.id,
              name: e.student.name,
              email: e.student.email,
            }))}
            available={availableStudents
              .filter((m) => !enrolledIds.has(m.user.id))
              .map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))}
            canManage={canManage}
            currentUserId={ctx.user.id}
          />
        </CardContent>
      </Card>

      <ClassAssignmentsPanel
        classId={klass.id}
        canManage={canManage}
        assignments={assignments}
        lessons={courseLessons}
      />
    </div>
  );
}
