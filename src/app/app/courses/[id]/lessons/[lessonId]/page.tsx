import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { LessonContent } from '@/components/app/lesson-content';
import { loadCourseLesson } from '@/lib/server/course-lessons';
import { requireOrgContext } from '@/lib/server/org-context';
import { roleHasPermission } from '@/lib/server/rbac';

export default async function LessonViewPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const ctx = await requireOrgContext();
  const canManage = roleHasPermission(ctx.role, 'course.manage');

  const view = await loadCourseLesson(ctx.org.id, id, lessonId, { canManage });
  if (!view) notFound();

  const { course, topic, lesson, prev, next } = view;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href={`/app/courses/${course.id}`}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {course.title}
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{lesson.kind}</Badge>
          {lesson.minutes ? <Badge variant="secondary">{lesson.minutes} min</Badge> : null}
          {!course.published && canManage && (
            <Badge variant="secondary" className="text-muted-foreground">
              Draft
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="text-sm text-muted-foreground">Topic {topic.order + 1} · {topic.title}</p>
      </header>

      <Card>
        <CardContent className="py-6">
          <LessonContent value={lesson.content} />
        </CardContent>
      </Card>

      <nav className="flex items-center justify-between gap-3">
        {prev ? (
          <Button variant="outline" size="sm" asChild className="min-w-0">
            <Link href={`/app/courses/${course.id}/lessons/${prev.id}`} className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{prev.title}</span>
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button variant="outline" size="sm" asChild className="min-w-0">
            <Link href={`/app/courses/${course.id}/lessons/${next.id}`} className="flex items-center gap-1">
              <span className="truncate">{next.title}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
