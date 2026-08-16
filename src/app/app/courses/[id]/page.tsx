import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { AddLessonForm } from '@/components/app/add-lesson-form';
import { AddTopicForm } from '@/components/app/add-topic-form';
import { LessonEditor } from '@/components/app/lesson-editor';
import { PublishToggle } from '@/components/app/publish-toggle';
import { TopicEditor } from '@/components/app/topic-editor';
import { requireOrgContext } from '@/lib/server/org-context';
import { roleHasPermission } from '@/lib/server/rbac';
import { prisma } from '@/lib/server/db';

const SUBJECT_COLORS: Record<string, string> = {
  german: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  english: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  math: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  science: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  programming: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const canManage = roleHasPermission(ctx.role, 'course.manage');

  const course = await prisma.course.findFirst({
    where: { id, orgId: ctx.org.id },
    include: {
      topics: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      },
      _count: { select: { classes: true } },
    },
  });

  if (!course) notFound();
  if (!canManage && !course.published) notFound();

  const color = SUBJECT_COLORS[course.subject] ?? SUBJECT_COLORS.programming;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/app/courses">
          <ChevronLeft className="mr-1 h-4 w-4" /> All courses
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
          {canManage && <PublishToggle courseId={course.id} published={course.published} />}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
        {course.description && <p className="max-w-2xl text-muted-foreground">{course.description}</p>}
      </header>

      <div className="space-y-4">
        {course.topics.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {canManage ? 'No topics yet. Add the first topic below.' : 'This course has no published topics yet.'}
            </CardContent>
          </Card>
        )}

        {course.topics.map((topic, index) => (
          <Card key={topic.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="truncate">{topic.title}</span>
                </span>
                {canManage && (
                  <TopicEditor
                    topic={{ id: topic.id, title: topic.title, description: topic.description, lessonCount: topic.lessons.length }}
                    canMoveUp={index > 0}
                    canMoveDown={index < course.topics.length - 1}
                  />
                )}
              </CardTitle>
              {topic.description && <CardDescription>{topic.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-2">
              {topic.lessons.length === 0 && (
                <p className="text-sm text-muted-foreground">No lessons yet.</p>
              )}
              {topic.lessons.map((lesson, lessonIndex) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/app/courses/${course.id}/lessons/${lesson.id}`}
                      className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {lesson.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {lesson.kind}
                      {lesson.minutes ? ` · ${lesson.minutes} min` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                    {String(lesson.order + 1).padStart(2, '0')}
                  </span>
                  {canManage && (
                    <LessonEditor
                      lesson={{ id: lesson.id, title: lesson.title, kind: lesson.kind, minutes: lesson.minutes, content: lesson.content }}
                      canMoveUp={lessonIndex > 0}
                      canMoveDown={lessonIndex < topic.lessons.length - 1}
                    />
                  )}
                </div>
              ))}
              {canManage && <AddLessonForm topicId={topic.id} />}
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add topic</CardTitle>
          </CardHeader>
          <CardContent>
            <AddTopicForm courseId={course.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
