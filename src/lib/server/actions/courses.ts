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
    revalidatePath(`/app/courses/${course.id}`);
    return { ok: true, data: { id: lesson.id } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}
