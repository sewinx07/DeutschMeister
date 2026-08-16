import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CreateCourseForm } from '@/components/app/create-course-form';
import { requireOrgContext } from '@/lib/server/org-context';
import { roleHasPermission } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';

export const metadata = {
  title: 'Courses',
};

const SUBJECT_COLORS: Record<string, string> = {
  german: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  english: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  math: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  science: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  programming: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

export default async function CoursesPage() {
  const ctx = await requireOrgContext();
  const canManage = roleHasPermission(ctx.role, 'course.manage');

  const courses = await prisma.course.findMany({
    where: { orgId: ctx.org.id, ...(canManage ? {} : { published: true }) },
    orderBy: { createdAt: 'desc' },
    include: {
      topics: { include: { lessons: true }, orderBy: { order: 'asc' } },
      _count: { select: { classes: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">
            {canManage
              ? 'All courses in this organization.'
              : 'Courses published for you.'}
          </p>
        </div>
      </header>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {canManage ? 'No courses yet. Create the first one below.' : 'No published courses yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => {
            const lessonCount = course.topics.reduce((n, t) => n + t.lessons.length, 0);
            const color = SUBJECT_COLORS[course.subject] ?? SUBJECT_COLORS.programming;
            return (
              <Link key={course.id} href={`/app/courses/${course.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={color}>
                        {course.subject}
                        {course.level ? ` · ${course.level}` : ''}
                      </Badge>
                      {!course.published && (
                        <Badge variant="secondary" className="text-muted-foreground">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base">{course.title}</CardTitle>
                    {course.description && (
                      <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {course.topics.length} topic{course.topics.length === 1 ? '' : 's'} ·{' '}
                      {lessonCount} lesson{lessonCount === 1 ? '' : 's'} · {course._count.classes} class
                      {course._count.classes === 1 ? '' : 'es'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {canManage && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create a course</CardTitle>
              <CardDescription>Start with a title and subject; add topics and lessons next.</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateCourseForm orgId={ctx.org.id} />
            </CardContent>
          </Card>
        </>
      )}

      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/app/classes">Manage classes →</Link>
        </Button>
      </div>
    </div>
  );
}
