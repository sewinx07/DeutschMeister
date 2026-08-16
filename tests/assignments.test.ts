import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/server/db';
import { MembershipStatus, Role } from '@/generated/prisma/enums';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { requireUser } = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock('@/lib/server/auth-helpers', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/server/auth-helpers')>();
  return { ...mod, requireUser };
});

import {
  createAssignment,
  deleteAssignment,
  setAssignmentDone,
} from '@/lib/server/actions/assignments';
import {
  loadAssignmentsForUser,
  loadClassAssignments,
  loadCourseLessonsForClass,
} from '@/lib/server/assignments';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('class assignments', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgAId = '';
  let orgBId = '';
  let ownerAId = '';
  let teacherAId = '';
  let student1Id = '';
  let student2Id = '';
  let foreignId = '';
  let classAId = '';
  let l1 = '';
  let l2 = '';
  let lX = '';

  beforeAll(async () => {
    if (!enabled) return;
    const orgA = await prisma.organization.create({ data: { name: `asg-${tag}`, slug: `asg-${tag}` } });
    const orgB = await prisma.organization.create({ data: { name: `asg-${tag}-x`, slug: `asg-${tag}-x` } });
    orgAId = orgA.id;
    orgBId = orgB.id;
    orgIds.push(orgAId, orgBId);

    const owner = await prisma.user.create({ data: { email: `asgo-${tag}@test`, name: 'Owner' } });
    const teacher = await prisma.user.create({ data: { email: `asgt-${tag}@test`, name: 'Teacher' } });
    const s1 = await prisma.user.create({ data: { email: `asgs1-${tag}@test`, name: 'Student 1' } });
    const s2 = await prisma.user.create({ data: { email: `asgs2-${tag}@test`, name: 'Student 2' } });
    const foreign = await prisma.user.create({ data: { email: `asgf-${tag}@test`, name: 'Foreign' } });
    ownerAId = owner.id;
    teacherAId = teacher.id;
    student1Id = s1.id;
    student2Id = s2.id;
    foreignId = foreign.id;
    userIds.push(ownerAId, teacherAId, student1Id, student2Id, foreignId);

    await prisma.organizationMember.createMany({
      data: [
        { orgId: orgAId, userId: ownerAId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: teacherAId, role: Role.TEACHER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: student1Id, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: student2Id, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
        { orgId: orgBId, userId: foreignId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
      ],
    });

    const courseA = await prisma.course.create({
      data: { orgId: orgAId, title: `Deutsch ${tag}`, subject: 'German', published: true },
    });
    const courseB = await prisma.course.create({
      data: { orgId: orgAId, title: `Other ${tag}`, subject: 'Other', published: true },
    });
    const topicA = await prisma.courseTopic.create({
      data: { courseId: courseA.id, order: 0, title: 'Topic A' },
    });
    const topicB = await prisma.courseTopic.create({
      data: { courseId: courseB.id, order: 0, title: 'Topic B' },
    });
    const la = await prisma.courseLesson.create({
      data: { topicId: topicA.id, order: 0, title: 'Lesson A1', kind: 'grammar', minutes: 15 },
    });
    const lb = await prisma.courseLesson.create({
      data: { topicId: topicA.id, order: 1, title: 'Lesson A2', kind: 'vocabulary', minutes: 10 },
    });
    const lx = await prisma.courseLesson.create({
      data: { topicId: topicB.id, order: 0, title: 'Lesson B', kind: 'reading', minutes: 20 },
    });
    l1 = la.id;
    l2 = lb.id;
    lX = lx.id;

    const klass = await prisma.class.create({
      data: { orgId: orgAId, courseId: courseA.id, teacherId: teacherAId, name: `Group ${tag}` },
    });
    classAId = klass.id;
    await prisma.classEnrollment.create({ data: { classId: classAId, studentId: student1Id } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.auditLog.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.classAssignment.deleteMany({ where: { class: { orgId: { in: orgIds } } } });
    await prisma.classEnrollment.deleteMany({ where: { class: { orgId: { in: orgIds } } } });
    await prisma.class.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.courseLesson.deleteMany({ where: { topic: { course: { orgId: { in: orgIds } } } } });
    await prisma.courseTopic.deleteMany({ where: { course: { orgId: { in: orgIds } } } });
    await prisma.course.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  async function actAs(userId: string) {
    requireUser.mockResolvedValue({ id: userId, name: 'Actor', email: 'actor@test', isPlatformAdmin: false });
  }

  it('teacher can create an assignment for a lesson in the class course, with an audit row', async () => {
    await actAs(teacherAId);
    const res = await createAssignment({ classId: classAId, lessonId: l1, dueAt: '2030-01-01' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const audit = await prisma.auditLog.count({
      where: { action: 'assignment.created', targetId: res.data.id, orgId: orgAId },
    });
    expect(audit).toBe(1);
  });

  it('rejects lessons not in the class course and invalid dates', async () => {
    await actAs(teacherAId);
    const wrongLesson = await createAssignment({ classId: classAId, lessonId: lX, dueAt: '2030-01-01' });
    expect(wrongLesson.ok).toBe(false);

    const badDate = await createAssignment({ classId: classAId, lessonId: l1, dueAt: 'not-a-date' });
    expect(badDate.ok).toBe(false);
  });

  it('students cannot create or delete assignments', async () => {
    await actAs(student1Id);
    const created = await createAssignment({ classId: classAId, lessonId: l1, dueAt: '2030-01-01' });
    expect(created.ok).toBe(false);
    expect(created.ok === false && created.error.code).toBe('FORBIDDEN');

    const existing = await prisma.classAssignment.findFirst({ where: { classId: classAId } });
    expect(existing).not.toBeNull();
    const deleted = await deleteAssignment({ assignmentId: existing!.id });
    expect(deleted.ok).toBe(false);
    expect(deleted.ok === false && deleted.error.code).toBe('FORBIDDEN');
  });

  it('enrolled students can mark done and undo; others are forbidden', async () => {
    await actAs(teacherAId);
    const res = await createAssignment({ classId: classAId, lessonId: l2, dueAt: '2030-01-02' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const assignmentId = res.data.id;

    await actAs(student1Id);
    const done = await setAssignmentDone({ assignmentId, done: true });
    expect(done.ok).toBe(true);

    const items = await loadClassAssignments(orgAId, classAId, student1Id);
    const mine = items.find((a) => a.id === assignmentId);
    expect(mine?.submitted).toBe(true);
    expect(mine?.submittedCount).toBe(1);
    expect(mine?.studentsCount).toBe(1);
    expect(mine?.lessonTitle).toBe('Lesson A2');

    await actAs(student2Id);
    const notEnrolled = await setAssignmentDone({ assignmentId, done: true });
    expect(notEnrolled.ok).toBe(false);
    expect(notEnrolled.ok === false && notEnrolled.error.code).toBe('FORBIDDEN');

    await actAs(foreignId);
    const crossOrg = await setAssignmentDone({ assignmentId, done: true });
    expect(crossOrg.ok).toBe(false);

    await actAs(student1Id);
    const undo = await setAssignmentDone({ assignmentId, done: false });
    expect(undo.ok).toBe(true);
    const after = await loadClassAssignments(orgAId, classAId, student1Id);
    expect(after.find((a) => a.id === assignmentId)?.submitted).toBe(false);
  });

  it('loadAssignmentsForUser respects org, teaching and enrolled scopes', async () => {
    await actAs(teacherAId);
    const res = await createAssignment({ classId: classAId, lessonId: l1, dueAt: '2030-01-03' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const assignmentId = res.data.id;

    const orgScope = await loadAssignmentsForUser(orgAId, ownerAId, 'org');
    expect(orgScope.some((a) => a.id === assignmentId)).toBe(true);

    const teaching = await loadAssignmentsForUser(orgAId, teacherAId, 'teaching');
    expect(teaching.some((a) => a.id === assignmentId)).toBe(true);

    const enrolled = await loadAssignmentsForUser(orgAId, student1Id, 'enrolled');
    expect(enrolled.some((a) => a.id === assignmentId)).toBe(true);

    const otherStudent = await loadAssignmentsForUser(orgAId, student2Id, 'enrolled');
    expect(otherStudent.some((a) => a.id === assignmentId)).toBe(false);
  });

  it('loadCourseLessonsForClass returns the class course lessons in order', async () => {
    const lessons = await loadCourseLessonsForClass(orgAId, classAId);
    expect(lessons.map((l) => l.title)).toEqual(['Lesson A1', 'Lesson A2']);
    expect(lessons[0]).toMatchObject({ topicTitle: 'Topic A', kind: 'grammar', minutes: 15 });
  });

  it('managers can delete an assignment', async () => {
    await actAs(teacherAId);
    const res = await createAssignment({ classId: classAId, lessonId: l1, dueAt: '2030-01-04' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const before = await loadClassAssignments(orgAId, classAId, teacherAId);
    expect(before.some((a) => a.id === res.data.id)).toBe(true);

    const removed = await deleteAssignment({ assignmentId: res.data.id });
    expect(removed.ok).toBe(true);

    const after = await loadClassAssignments(orgAId, classAId, teacherAId);
    expect(after.some((a) => a.id === res.data.id)).toBe(false);
  });
});
