import { prisma } from '@/lib/server/db';

export type CourseLessonView = {
  course: {
    id: string;
    title: string;
    subject: string;
    level: string | null;
    published: boolean;
  };
  topic: {
    id: string;
    title: string;
    order: number;
  };
  lesson: {
    id: string;
    title: string;
    kind: string;
    minutes: number | null;
    content: unknown;
  };
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
};

/**
 * Loads a course lesson for viewing, org-scoped and visibility-gated:
 * unpublished courses are only visible to managers. Returns null when the
 * course is not in the org, is unpublished without `course.manage`, or the
 * lesson does not exist.
 */
export async function loadCourseLesson(
  orgId: string,
  courseId: string,
  lessonId: string,
  opts: { canManage: boolean },
): Promise<CourseLessonView | null> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, orgId },
    include: {
      topics: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      },
    },
  });

  if (!course) return null;
  if (!opts.canManage && !course.published) return null;

  const topic = course.topics.find((t) => t.lessons.some((l) => l.id === lessonId));
  if (!topic) return null;
  const lesson = topic.lessons.find((l) => l.id === lessonId);
  if (!lesson) return null;

  const flat = course.topics.flatMap((t) => t.lessons.map((l) => ({ id: l.id, title: l.title })));
  const index = flat.findIndex((l) => l.id === lessonId);

  return {
    course: {
      id: course.id,
      title: course.title,
      subject: course.subject,
      level: course.level,
      published: course.published,
    },
    topic: { id: topic.id, title: topic.title, order: topic.order },
    lesson: {
      id: lesson.id,
      title: lesson.title,
      kind: lesson.kind,
      minutes: lesson.minutes,
      content: lesson.content,
    },
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}
