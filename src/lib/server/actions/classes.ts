'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { MembershipStatus, Role } from '@/generated/prisma/enums';
import { prisma } from '@/lib/server/db';
import { ActionError, toActionError } from '@/lib/server/errors';
import { requireUser } from '@/lib/server/auth-helpers';
import { recordAudit } from '@/lib/server/audit';
import { recordActivity } from '@/lib/server/activity';
import { assertPermission, resolveMembership } from '@/lib/server/tenant';
import { canManageClass } from '@/lib/server/rbac';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function assertClassManager(userId: string, orgId: string, klassTeacherId: string | null, isPlatformAdmin: boolean) {
  if (isPlatformAdmin) return;
  const membership = await resolveMembership(userId, orgId);
  if (!membership) throw new ActionError('FORBIDDEN', 'You do not have access to this organization.');
  if (!canManageClass(membership.role as Role, klassTeacherId, userId)) {
    throw new ActionError('FORBIDDEN', 'You are not allowed to manage this class.');
  }
}

export async function createClass(
  input: { orgId: string; courseId: string; teacherId?: string; name: string; description?: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = z
      .object({
        orgId: z.string().min(1),
        courseId: z.string().min(1),
        teacherId: z.string().optional(),
        name: z.string().min(2, 'Class name must be at least 2 characters').max(120),
        description: z.string().max(500).optional(),
      })
      .parse(input);

    await assertPermission(user.id, data.orgId, 'class.manage', { isPlatformAdmin: user.isPlatformAdmin });

    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course || course.orgId !== data.orgId) {
      throw new ActionError('NOT_FOUND', 'Course not found in this organization.');
    }

    if (data.teacherId) {
      const teacher = await resolveActiveMember(data.orgId, data.teacherId);
      if (!teacher) throw new ActionError('NOT_FOUND', 'Teacher is not a member of this organization.');
    }

    const klass = await prisma.class.create({
      data: {
        orgId: data.orgId,
        courseId: data.courseId,
        teacherId: data.teacherId ?? null,
        name: data.name,
        description: data.description ?? null,
      },
    });
    await recordAudit({
      orgId: data.orgId,
      actorId: user.id,
      action: 'class.created',
      targetType: 'class',
      targetId: klass.id,
      meta: { name: klass.name, courseId: course.id },
    });
    await recordActivity({
      orgId: data.orgId,
      actorId: user.id,
      type: 'class.created',
      classId: klass.id,
      courseId: klass.courseId,
      summary: `created class ${klass.name}`,
    });
    revalidatePath('/app/classes');
    return { ok: true, data: { id: klass.id } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function enrollStudent(
  input: { classId: string; studentId: string }
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z.object({ classId: z.string().min(1), studentId: z.string().min(1) }).parse(input);

    const klass = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!klass) throw new ActionError('NOT_FOUND', 'Class not found.');
    await assertClassManager(user.id, klass.orgId, klass.teacherId, user.isPlatformAdmin);

    const student = await resolveActiveStudent(klass.orgId, data.studentId);
    if (!student) throw new ActionError('NOT_FOUND', 'Student is not a member of this organization.');

    try {
      await prisma.classEnrollment.create({ data: { classId: data.classId, studentId: data.studentId } });
    } catch {
      throw new ActionError('CONFLICT', 'This student is already enrolled.');
    }
    await recordAudit({
      orgId: klass.orgId,
      actorId: user.id,
      action: 'student.enrolled',
      targetType: 'class',
      targetId: data.classId,
      meta: { studentId: data.studentId },
    });
    const studentUser = await prisma.user.findUnique({
      where: { id: data.studentId },
      select: { name: true },
    });
    await recordActivity({
      orgId: klass.orgId,
      actorId: user.id,
      type: 'student.enrolled',
      classId: data.classId,
      studentId: data.studentId,
      summary: `added ${studentUser?.name ?? 'a student'} to ${klass.name}`,
      notify: {
        recipientIds: [data.studentId],
        title: `You were added to ${klass.name}`,
        body: klass.description ?? undefined,
        link: `/app/classes/${data.classId}`,
      },
    });
    revalidatePath(`/app/classes/${data.classId}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function removeEnrollment(
  input: { classId: string; studentId: string }
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const data = z.object({ classId: z.string().min(1), studentId: z.string().min(1) }).parse(input);

    const klass = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!klass) throw new ActionError('NOT_FOUND', 'Class not found.');
    await assertClassManager(user.id, klass.orgId, klass.teacherId, user.isPlatformAdmin);

    await prisma.classEnrollment.deleteMany({
      where: { classId: data.classId, studentId: data.studentId },
    });
    await recordAudit({
      orgId: klass.orgId,
      actorId: user.id,
      action: 'student.unenrolled',
      targetType: 'class',
      targetId: data.classId,
      meta: { studentId: data.studentId },
    });
    const studentUser = await prisma.user.findUnique({
      where: { id: data.studentId },
      select: { name: true },
    });
    await recordActivity({
      orgId: klass.orgId,
      actorId: user.id,
      type: 'student.unenrolled',
      classId: data.classId,
      studentId: data.studentId,
      summary: `removed ${studentUser?.name ?? 'a student'} from ${klass.name}`,
    });
    revalidatePath(`/app/classes/${data.classId}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

/** ACTIVE members whose org role qualifies them as teachers/students. */
async function resolveActiveMember(orgId: string, userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      orgId,
      userId,
      status: MembershipStatus.ACTIVE,
      role: { in: [Role.TEACHER, Role.ORGANIZATION_ADMIN, Role.ORGANIZATION_OWNER] },
    },
  });
  return membership;
}

/** ACTIVE members with the student role, i.e. who may be enrolled in a class. */
async function resolveActiveStudent(orgId: string, userId: string) {
  return prisma.organizationMember.findFirst({
    where: { orgId, userId, status: MembershipStatus.ACTIVE, role: Role.STUDENT },
  });
}
