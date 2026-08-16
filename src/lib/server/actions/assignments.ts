'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/server/db';
import { ActionError, toActionError } from '@/lib/server/errors';
import { requireUser } from '@/lib/server/auth-helpers';
import { recordAudit } from '@/lib/server/audit';
import { canManageClass } from '@/lib/server/rbac';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function assertClassManager(userId: string, orgId: string, klassTeacherId: string | null, isPlatformAdmin: boolean) {
  if (isPlatformAdmin) return;
  const membership = await prisma.organizationMember.findFirst({
    where: { orgId, userId, status: 'ACTIVE' },
  });
  if (!membership) throw new ActionError('FORBIDDEN', 'You do not have access to this organization.');
  if (!canManageClass(membership.role, klassTeacherId, userId)) {
    throw new ActionError('FORBIDDEN', 'You are not allowed to manage this class.');
  }
}

export async function createAssignment(
  input: { classId: string; lessonId: string; dueAt: string; note?: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = z
      .object({
        classId: z.string().min(1),
        lessonId: z.string().min(1),
        dueAt: z.string().regex(DATE_RE, 'Use a valid date (YYYY-MM-DD).'),
        note: z.string().max(500).optional(),
      })
      .parse(input);

    const klass = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!klass) throw new ActionError('NOT_FOUND', 'Class not found.');
    await assertClassManager(user.id, klass.orgId, klass.teacherId, user.isPlatformAdmin);

    const lesson = await prisma.courseLesson.findUnique({
      where: { id: data.lessonId },
      include: { topic: { select: { courseId: true } } },
    });
    if (!lesson || lesson.topic.courseId !== klass.courseId) {
      throw new ActionError('NOT_FOUND', 'This lesson is not part of the class course.');
    }

    const dueAt = new Date(`${data.dueAt}T23:59:59`);

    const assignment = await prisma.classAssignment.create({
      data: {
        classId: data.classId,
        lessonId: data.lessonId,
        assignedById: user.id,
        dueAt,
        note: data.note?.trim() || null,
      },
    });
    await recordAudit({
      orgId: klass.orgId,
      actorId: user.id,
      action: 'assignment.created',
      targetType: 'assignment',
      targetId: assignment.id,
      meta: { classId: data.classId, lessonId: data.lessonId, dueAt: data.dueAt },
    });
    revalidatePath(`/app/classes/${data.classId}`);
    revalidatePath('/app/assignments');
    revalidatePath('/app');
    return { ok: true, data: { id: assignment.id } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function deleteAssignment(input: { assignmentId: string }): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z.object({ assignmentId: z.string().min(1) }).parse(input);

    const assignment = await prisma.classAssignment.findUnique({
      where: { id: data.assignmentId },
      include: { class: { select: { orgId: true, teacherId: true } } },
    });
    if (!assignment) throw new ActionError('NOT_FOUND', 'Assignment not found.');
    await assertClassManager(user.id, assignment.class.orgId, assignment.class.teacherId, user.isPlatformAdmin);

    await prisma.classAssignment.delete({ where: { id: data.assignmentId } });
    await recordAudit({
      orgId: assignment.class.orgId,
      actorId: user.id,
      action: 'assignment.deleted',
      targetType: 'assignment',
      targetId: data.assignmentId,
    });
    revalidatePath(`/app/classes/${assignment.classId}`);
    revalidatePath('/app/assignments');
    revalidatePath('/app');
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function setAssignmentDone(input: { assignmentId: string; done: boolean }): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z.object({ assignmentId: z.string().min(1), done: z.boolean() }).parse(input);

    const assignment = await prisma.classAssignment.findUnique({
      where: { id: data.assignmentId },
      include: { class: { select: { orgId: true, enrollments: { where: { studentId: user.id }, select: { studentId: true } } } } },
    });
    if (!assignment) throw new ActionError('NOT_FOUND', 'Assignment not found.');
    if (assignment.class.enrollments.length === 0) {
      throw new ActionError('FORBIDDEN', 'You are not enrolled in this class.');
    }

    if (data.done) {
      await prisma.assignmentSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: data.assignmentId, studentId: user.id } },
        create: { assignmentId: data.assignmentId, studentId: user.id },
        update: {},
      });
    } else {
      await prisma.assignmentSubmission.deleteMany({
        where: { assignmentId: data.assignmentId, studentId: user.id },
      });
    }

    revalidatePath(`/app/classes/${assignment.classId}`);
    revalidatePath('/app/assignments');
    revalidatePath('/app');
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}
