'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/server/db';
import { ActionError, toActionError } from '@/lib/server/errors';
import { requireUser } from '@/lib/server/auth-helpers';
import { recordAudit } from '@/lib/server/audit';
import { assertPermission } from '@/lib/server/tenant';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

const courseInput = z.object({
  orgId: z.string().min(1),
  title: z.string().min(2, 'Title must be at least 2 characters').max(160),
  subject: z.string().min(1).max(80),
  description: z.string().max(1000).optional(),
  level: z.string().max(40).optional(),
  color: z.string().max(20).optional(),
});

export async function createCourse(
  input: z.infer<typeof courseInput>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = courseInput.parse(input);
    await assertPermission(user.id, data.orgId, 'course.manage', { isPlatformAdmin: user.isPlatformAdmin });

    const org = await prisma.organization.findUnique({ where: { id: data.orgId } });
    if (!org) throw new ActionError('NOT_FOUND', 'Organization not found.');

    const course = await prisma.course.create({
      data: {
        orgId: data.orgId,
        title: data.title,
        subject: data.subject,
        description: data.description ?? null,
        level: data.level ?? null,
        color: data.color ?? null,
        createdById: user.id,
      },
    });
    await recordAudit({
      orgId: data.orgId,
      actorId: user.id,
      action: 'course.created',
      targetType: 'course',
      targetId: course.id,
      meta: { title: course.title },
    });
    revalidatePath('/app/courses');
    return { ok: true, data: { id: course.id } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function setCoursePublished(
  input: { courseId: string; published: boolean }
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const { courseId, published } = z
      .object({ courseId: z.string().min(1), published: z.boolean() })
      .parse(input);

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new ActionError('NOT_FOUND', 'Course not found.');
    await assertPermission(user.id, course.orgId, 'course.manage', { isPlatformAdmin: user.isPlatformAdmin });

    await prisma.course.update({ where: { id: courseId }, data: { published } });
    await recordAudit({
      orgId: course.orgId,
      actorId: user.id,
      action: published ? 'course.published' : 'course.unpublished',
      targetType: 'course',
      targetId: courseId,
    });
    revalidatePath('/app/courses');
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function createTopic(
  input: { courseId: string; title: string; description?: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = z
      .object({
        courseId: z.string().min(1),
        title: z.string().min(2).max(160),
        description: z.string().max(500).optional(),
      })
      .parse(input);

    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw new ActionError('NOT_FOUND', 'Course not found.');
    await assertPermission(user.id, course.orgId, 'course.manage', { isPlatformAdmin: user.isPlatformAdmin });

    const order = await prisma.courseTopic.count({ where: { courseId: data.courseId } });
    const topic = await prisma.courseTopic.create({
      data: { courseId: data.courseId, title: data.title, description: data.description ?? null, order },
    });
    await recordAudit({
      orgId: course.orgId,
      actorId: user.id,
      action: 'course.topic.created',
      targetType: 'course_topic',
      targetId: topic.id,
      meta: { title: topic.title },
    });
    revalidatePath(`/app/courses/${course.id}`);
    return { ok: true, data: { id: topic.id } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function createLesson(
  input: {
    topicId: string;
    title: string;
    kind: string;
    minutes?: number;
    content?: Record<string, unknown>;
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = z
      .object({
        topicId: z.string().min(1),
        title: z.string().min(2).max(160),
        kind: z.string().min(1).max(40),
        minutes: z.number().int().min(1).max(600).optional(),
        content: z.record(z.unknown()).optional(),
      })
      .parse(input);

    const topic = await prisma.courseTopic.findUnique({ where: { id: data.topicId } });
    if (!topic) throw new ActionError('NOT_FOUND', 'Topic not found.');
    const course = await prisma.course.findUnique({ where: { id: topic.courseId } });
    if (!course) throw new ActionError('NOT_FOUND', 'Course not found.');
    await assertPermission(user.id, course.orgId, 'course.manage', { isPlatformAdmin: user.isPlatformAdmin });

    const order = await prisma.courseLesson.count({ where: { topicId: data.topicId } });
    const lesson = await prisma.courseLesson.create({
      data: {
        topicId: data.topicId,
        title: data.title,
        kind: data.kind,
        minutes: data.minutes ?? null,
        content: data.content as Prisma.InputJsonValue | undefined,
        order,
      },
    });
    await recordAudit({
      orgId: course.orgId,
      actorId: user.id,
      action: 'course.lesson.created',
      targetType: 'course_lesson',
      targetId: lesson.id,
      meta: { title: lesson.title },
    });
    revalidatePath(`/app/courses/${course.id}`);
    return { ok: true, data: { id: lesson.id } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

async function loadCourseForLesson(
  user: Awaited<ReturnType<typeof requireUser>>,
  lessonId: string,
): Promise<{ courseId: string; orgId: string }> {
  const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new ActionError('NOT_FOUND', 'Lesson not found.');
  const topic = await prisma.courseTopic.findUnique({ where: { id: lesson.topicId } });
  if (!topic) throw new ActionError('NOT_FOUND', 'Topic not found.');
  const course = await prisma.course.findUnique({ where: { id: topic.courseId } });
  if (!course) throw new ActionError('NOT_FOUND', 'Course not found.');
  await assertPermission(user.id, course.orgId, 'course.manage', { isPlatformAdmin: user.isPlatformAdmin });
  return { courseId: course.id, orgId: course.orgId };
}

export async function updateTopic(
  input: { topicId: string; title: string; description?: string }
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z
      .object({
        topicId: z.string().min(1),
        title: z.string().min(2).max(160),
        description: z.string().max(500).optional(),
      })
      .parse(input);

    const topic = await prisma.courseTopic.findUnique({ where: { id: data.topicId } });
    if (!topic) throw new ActionError('NOT_FOUND', 'Topic not found.');
    const course = await prisma.course.findUnique({ where: { id: topic.courseId } });
    if (!course) throw new ActionError('NOT_FOUND', 'Course not found.');
    await assertPermission(user.id, course.orgId, 'course.manage', { isPlatformAdmin: user.isPlatformAdmin });

    await prisma.courseTopic.update({
      where: { id: data.topicId },
      data: { title: data.title, description: data.description ?? null },
    });
    await recordAudit({
      orgId: course.orgId,
      actorId: user.id,
      action: 'course.topic.updated',
      targetType: 'course_topic',
      targetId: data.topicId,
      meta: { title: data.title },
    });
    revalidatePath(`/app/courses/${course.id}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function deleteTopic(input: { topicId: string }): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z.object({ topicId: z.string().min(1) }).parse(input);

    const topic = await prisma.courseTopic.findUnique({ where: { id: data.topicId } });
    if (!topic) throw new ActionError('NOT_FOUND', 'Topic not found.');
    const course = await prisma.course.findUnique({ where: { id: topic.courseId } });
    if (!course) throw new ActionError('NOT_FOUND', 'Course not found.');
    await assertPermission(user.id, course.orgId, 'course.manage', { isPlatformAdmin: user.isPlatformAdmin });

    const lessonCount = await prisma.courseLesson.count({ where: { topicId: data.topicId } });
    await prisma.courseTopic.delete({ where: { id: data.topicId } });
    await recordAudit({
      orgId: course.orgId,
      actorId: user.id,
      action: 'course.topic.deleted',
      targetType: 'course_topic',
      targetId: data.topicId,
      meta: { title: topic.title, lessonsRemoved: lessonCount },
    });
    revalidatePath(`/app/courses/${course.id}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function moveTopic(
  input: { topicId: string; direction: 'up' | 'down' }
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z.object({ topicId: z.string().min(1), direction: z.enum(['up', 'down']) }).parse(input);

    const topic = await prisma.courseTopic.findUnique({ where: { id: data.topicId } });
    if (!topic) throw new ActionError('NOT_FOUND', 'Topic not found.');
    const course = await prisma.course.findUnique({ where: { id: topic.courseId } });
    if (!course) throw new ActionError('NOT_FOUND', 'Course not found.');
    await assertPermission(user.id, course.orgId, 'course.manage', { isPlatformAdmin: user.isPlatformAdmin });

    const neighbor = await prisma.courseTopic.findFirst({
      where: { courseId: topic.courseId, order: data.direction === 'up' ? { lt: topic.order } : { gt: topic.order } },
      orderBy: { order: data.direction === 'up' ? 'desc' : 'asc' },
    });
    if (!neighbor) return { ok: true, data: null };

    await prisma.$transaction([
      prisma.courseTopic.update({ where: { id: topic.id }, data: { order: neighbor.order } }),
      prisma.courseTopic.update({ where: { id: neighbor.id }, data: { order: topic.order } }),
    ]);
    await recordAudit({
      orgId: course.orgId,
      actorId: user.id,
      action: 'course.topic.moved',
      targetType: 'course_topic',
      targetId: topic.id,
      meta: { direction: data.direction },
    });
    revalidatePath(`/app/courses/${course.id}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function updateLesson(
  input: {
    lessonId: string;
    title: string;
    kind: string;
    minutes?: number;
    content?: Record<string, unknown> | null;
  }
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z
      .object({
        lessonId: z.string().min(1),
        title: z.string().min(2).max(160),
        kind: z.string().min(1).max(40),
        minutes: z.number().int().min(1).max(600).optional(),
        content: z.record(z.unknown()).nullable().optional(),
      })
      .parse(input);

    const { courseId, orgId } = await loadCourseForLesson(user, data.lessonId);

    await prisma.courseLesson.update({
      where: { id: data.lessonId },
      data: {
        title: data.title,
        kind: data.kind,
        minutes: data.minutes ?? null,
        content: data.content === undefined ? undefined : ((data.content ?? Prisma.JsonNull) as Prisma.InputJsonValue),
      },
    });
    await recordAudit({
      orgId,
      actorId: user.id,
      action: 'course.lesson.updated',
      targetType: 'course_lesson',
      targetId: data.lessonId,
      meta: { title: data.title },
    });
    revalidatePath(`/app/courses/${courseId}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function deleteLesson(input: { lessonId: string }): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z.object({ lessonId: z.string().min(1) }).parse(input);

    const lesson = await prisma.courseLesson.findUnique({ where: { id: data.lessonId } });
    if (!lesson) throw new ActionError('NOT_FOUND', 'Lesson not found.');
    const { courseId, orgId } = await loadCourseForLesson(user, data.lessonId);

    await prisma.courseLesson.delete({ where: { id: data.lessonId } });
    await recordAudit({
      orgId,
      actorId: user.id,
      action: 'course.lesson.deleted',
      targetType: 'course_lesson',
      targetId: data.lessonId,
      meta: { title: lesson.title },
    });
    revalidatePath(`/app/courses/${courseId}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function moveLesson(
  input: { lessonId: string; direction: 'up' | 'down' }
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z.object({ lessonId: z.string().min(1), direction: z.enum(['up', 'down']) }).parse(input);

    const lesson = await prisma.courseLesson.findUnique({ where: { id: data.lessonId } });
    if (!lesson) throw new ActionError('NOT_FOUND', 'Lesson not found.');
    const { courseId, orgId } = await loadCourseForLesson(user, data.lessonId);

    const neighbor = await prisma.courseLesson.findFirst({
      where: { topicId: lesson.topicId, order: data.direction === 'up' ? { lt: lesson.order } : { gt: lesson.order } },
      orderBy: { order: data.direction === 'up' ? 'desc' : 'asc' },
    });
    if (!neighbor) return { ok: true, data: null };

    await prisma.$transaction([
      prisma.courseLesson.update({ where: { id: lesson.id }, data: { order: neighbor.order } }),
      prisma.courseLesson.update({ where: { id: neighbor.id }, data: { order: lesson.order } }),
    ]);
    await recordAudit({
      orgId,
      actorId: user.id,
      action: 'course.lesson.moved',
      targetType: 'course_lesson',
      targetId: lesson.id,
      meta: { direction: data.direction },
    });
    revalidatePath(`/app/courses/${courseId}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}
