import { prisma } from '@/lib/server/db';
import { getStudySummary } from '@/lib/server/study';
import type { StudySummary } from '@/types';

export interface ClassStudentProgress {
  student: { id: string; name: string; email: string };
  summary: StudySummary | null;
}

export interface ClassProgress {
  classId: string;
  className: string;
  teacherId: string;
  courseTitle: string;
  subject: string;
  level: string | null;
  students: ClassStudentProgress[];
}

/**
 * Read-only per-student progress for a class. Org-scoped by `orgId`, so a
 * class of another tenant is never visible. No rows are created or written.
 */
export async function loadClassProgress(orgId: string, classId: string): Promise<ClassProgress | null> {
  const klass = await prisma.class.findFirst({
    where: { id: classId, orgId },
    include: {
      course: { select: { title: true, subject: true, level: true } },
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { enrolledAt: 'asc' },
      },
    },
  });
  if (!klass) return null;

  const students: ClassStudentProgress[] = await Promise.all(
    klass.enrollments.map(async (e) => ({
      student: e.student,
      summary: await getStudySummary(orgId, e.student.id),
    })),
  );

  return {
    classId: klass.id,
    className: klass.name,
    teacherId: klass.teacherId ?? '',
    courseTitle: klass.course.title,
    subject: klass.course.subject,
    level: klass.course.level,
    students,
  };
}
