import { prisma } from '@/lib/server/db';

export type AssignmentItem = {
  id: string;
  classId: string;
  className: string;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  lessonKind: string;
  minutes: number | null;
  note: string | null;
  dueAt: Date;
  assignedByName: string | null;
  studentsCount: number;
  submittedCount: number;
  submitted: boolean;
  completedAt: Date | null;
  isOverdue: boolean;
  dueLabel: string;
};

function dueInfoFor(dueAt: Date): { isOverdue: boolean; dueLabel: string } {
  const days = Math.ceil((dueAt.getTime() - Date.now()) / 86400000);
  if (days < 0)
    return {
      isOverdue: true,
      dueLabel: `Overdue ${dueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    };
  if (days === 0) return { isOverdue: false, dueLabel: 'Due today' };
  if (days === 1) return { isOverdue: false, dueLabel: 'Due tomorrow' };
  return {
    isOverdue: false,
    dueLabel: `Due ${dueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  };
}

function toItem(row: {
  id: string;
  classId: string;
  dueAt: Date;
  note: string | null;
  assignedBy: { name: string } | null;
  lesson: { id: string; title: string; kind: string; minutes: number | null; topic: { courseId: string } };
  className: string;
  studentsCount: number;
  submissions: { studentId: string; completedAt: Date }[];
  viewerId: string;
}): AssignmentItem {
  const mine = row.submissions.find((s) => s.studentId === row.viewerId);
  return {
    id: row.id,
    classId: row.classId,
    className: row.className,
    courseId: row.lesson.topic.courseId,
    lessonId: row.lesson.id,
    lessonTitle: row.lesson.title,
    lessonKind: row.lesson.kind,
    minutes: row.lesson.minutes,
    note: row.note,
    dueAt: row.dueAt,
    assignedByName: row.assignedBy?.name ?? null,
    studentsCount: row.studentsCount,
    submittedCount: row.submissions.length,
    submitted: Boolean(mine),
    completedAt: mine?.completedAt ?? null,
    ...dueInfoFor(row.dueAt),
  };
}

/** Org-scoped assignments for one class, with completion counts per student. */
export async function loadClassAssignments(
  orgId: string,
  classId: string,
  viewerId: string,
): Promise<AssignmentItem[]> {
  const klass = await prisma.class.findFirst({
    where: { id: classId, orgId },
    select: { name: true, _count: { select: { enrollments: true } } },
  });
  if (!klass) return [];

  const rows = await prisma.classAssignment.findMany({
    where: { classId },
    include: {
      lesson: { select: { id: true, title: true, kind: true, minutes: true, topic: { select: { courseId: true } } } },
      assignedBy: { select: { name: true } },
      submissions: { select: { studentId: true, completedAt: true } },
    },
    orderBy: { dueAt: 'asc' },
  });

  return rows.map((row) =>
    toItem({
      ...row,
      className: klass.name,
      studentsCount: klass._count.enrollments,
      viewerId,
    }),
  );
}

/** Flat list of a class's course lessons, used by the assignment form. */
export async function loadCourseLessonsForClass(orgId: string, classId: string) {
  const klass = await prisma.class.findFirst({
    where: { id: classId, orgId },
    include: {
      course: {
        include: { topics: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
      },
    },
  });
  if (!klass) return [];
  return klass.course.topics.flatMap((t) =>
    t.lessons.map((l) => ({ id: l.id, title: l.title, topicTitle: t.title, kind: l.kind, minutes: l.minutes })),
  );
}

/**
 * Assignments for the current user's scope, org-scoped and never writing rows.
 * - `org`: every class in the organization (org-level managers)
 * - `teaching`: classes taught by the user (teachers)
 * - `enrolled`: classes the user is enrolled in (students)
 */
export async function loadAssignmentsForUser(
  orgId: string,
  userId: string,
  scope: 'org' | 'teaching' | 'enrolled',
): Promise<AssignmentItem[]> {
  const where =
    scope === 'org'
      ? { class: { orgId } }
      : scope === 'teaching'
        ? { class: { orgId, teacherId: userId } }
        : { class: { orgId, enrollments: { some: { studentId: userId } } } };

  const rows = await prisma.classAssignment.findMany({
    where,
    include: {
      class: { select: { name: true, _count: { select: { enrollments: true } } } },
      lesson: { select: { id: true, title: true, kind: true, minutes: true, topic: { select: { courseId: true } } } },
      assignedBy: { select: { name: true } },
      submissions: { select: { studentId: true, completedAt: true } },
    },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
  });

  return rows.map((row) =>
    toItem({
      ...row,
      className: row.class.name,
      studentsCount: row.class._count.enrollments,
      viewerId: userId,
    }),
  );
}
