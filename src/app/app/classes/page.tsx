import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CreateClassForm } from '@/components/app/create-class-form';
import { requireOrgContext } from '@/lib/server/org-context';
import { roleHasPermission } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';
import { MembershipStatus, Role } from '@/generated/prisma/enums';

export const metadata = {
  title: 'Classes',
};

export default async function ClassesPage() {
  const ctx = await requireOrgContext();
  const canManage = roleHasPermission(ctx.role, 'class.manage');
  const isTeacher = ctx.role === Role.TEACHER;

  const classes = await prisma.class.findMany({
    where: canManage
      ? { orgId: ctx.org.id }
      : isTeacher
        ? { orgId: ctx.org.id, teacherId: ctx.user.id }
        : { orgId: ctx.org.id, enrollments: { some: { studentId: ctx.user.id } } },
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { id: true, title: true, subject: true } },
      teacher: { select: { id: true, name: true } },
      _count: { select: { enrollments: true } },
    },
  });

  const publishedCourses = canManage
    ? await prisma.course.findMany({ where: { orgId: ctx.org.id }, orderBy: { title: 'asc' } })
    : [];
  const teachers = canManage
    ? await prisma.organizationMember.findMany({
        where: {
          orgId: ctx.org.id,
          status: MembershipStatus.ACTIVE,
          role: { in: [Role.TEACHER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_OWNER] },
        },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
        <p className="text-muted-foreground">
          {canManage ? 'All classes in this organization.' : isTeacher ? 'Classes you teach.' : 'Classes you are enrolled in.'}
        </p>
      </header>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {canManage ? 'No classes yet. Create the first one below.' : 'No classes here yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((klass) => (
            <Link key={klass.id} href={`/app/classes/${klass.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{klass.course.subject}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {klass._count.enrollments} student{klass._count.enrollments === 1 ? '' : 's'}
                    </span>
                  </div>
                  <CardTitle className="text-base">{klass.name}</CardTitle>
                  <CardDescription className="line-clamp-1">
                    {klass.course.title}
                    {klass.teacher ? ` · ${klass.teacher.name}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {klass.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{klass.description}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create a class</CardTitle>
              <CardDescription>
                {publishedCourses.length === 0
                  ? 'Create a published course first.'
                  : 'Assign a course and teacher, then enroll students on the class page.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateClassForm
                orgId={ctx.org.id}
                courses={publishedCourses.map((c) => ({ id: c.id, title: c.title }))}
                teachers={teachers.map((m) => ({ id: m.user.id, name: m.user.name }))}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
