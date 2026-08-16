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

import { createAssignment, setAssignmentDone } from '@/lib/server/actions/assignments';
import { createClass, enrollStudent } from '@/lib/server/actions/classes';
import { createCourse } from '@/lib/server/actions/courses';
import { markNotificationsRead } from '@/lib/server/actions/notifications';
import { loadActivityFeed, loadNotifications } from '@/lib/server/activity';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('notifications & activity feed', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgAId = '';
  let orgBId = '';
  let ownerAId = '';
  let teacherAId = '';
  let student1Id = '';
  let student2Id = '';
  let student3Id = '';
  let foreignId = '';
  let classAId = '';
  let l1 = '';

  beforeAll(async () => {
    if (!enabled) return;
    const orgA = await prisma.organization.create({ data: { name: `act-${tag}`, slug: `act-${tag}` } });
    const orgB = await prisma.organization.create({ data: { name: `act-${tag}-x`, slug: `act-${tag}-x` } });
    orgAId = orgA.id;
    orgBId = orgB.id;
    orgIds.push(orgAId, orgBId);

    const owner = await prisma.user.create({ data: { email: `acto-${tag}@test`, name: 'Owner' } });
    const teacher = await prisma.user.create({ data: { email: `actt-${tag}@test`, name: 'Teacher' } });
    const s1 = await prisma.user.create({
      data: { email: `acts1-${tag}@test`, name: 'Student 1', currentOrganizationId: orgAId },
    });
    const s2 = await prisma.user.create({
      data: { email: `acts2-${tag}@test`, name: 'Student 2', currentOrganizationId: orgAId },
    });
    const s3 = await prisma.user.create({
      data: { email: `acts3-${tag}@test`, name: 'Student 3', currentOrganizationId: orgAId },
    });
    const foreign = await prisma.user.create({
      data: { email: `actf-${tag}@test`, name: 'Foreign', currentOrganizationId: orgBId },
    });
    ownerAId = owner.id;
    teacherAId = teacher.id;
    student1Id = s1.id;
    student2Id = s2.id;
    student3Id = s3.id;
    foreignId = foreign.id;
    userIds.push(ownerAId, teacherAId, student1Id, student2Id, student3Id, foreignId);

    await prisma.organizationMember.createMany({
      data: [
        { orgId: orgAId, userId: ownerAId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: teacherAId, role: Role.TEACHER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: student1Id, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: student2Id, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: student3Id, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
        { orgId: orgBId, userId: foreignId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
      ],
    });

    await actAs(ownerAId);
    const course = await createCourse({
      orgId: orgAId,
      title: `Deutsch ${tag}`,
      subject: 'German',
    });
    if (!course.ok) throw new Error(course.error.message);
    const topic = await prisma.courseTopic.create({
      data: { courseId: course.data.id, order: 0, title: 'Topic A' },
    });
    const la = await prisma.courseLesson.create({
      data: { topicId: topic.id, order: 0, title: 'Lesson A1', kind: 'grammar', minutes: 15 },
    });
    l1 = la.id;

    const klass = await createClass({
      orgId: orgAId,
      courseId: course.data.id,
      teacherId: teacherAId,
      name: `Group ${tag}`,
    });
    if (!klass.ok) throw new Error(klass.error.message);
    classAId = klass.data.id;
    await prisma.classEnrollment.create({ data: { classId: classAId, studentId: student1Id } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.notification.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.activityEvent.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.auditLog.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.assignmentSubmission.deleteMany({ where: { assignment: { class: { orgId: { in: orgIds } } } } });
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

  async function countEvents(type: string, extra: object = {}) {
    return prisma.activityEvent.count({ where: { orgId: orgAId, type, ...extra } });
  }

  it('creating an assignment records an event and notifies enrolled students only', async () => {
    await actAs(teacherAId);
    const res = await createAssignment({ classId: classAId, lessonId: l1, dueAt: '2030-01-01' });
    expect(res.ok).toBe(true);
    expect(await countEvents('assignment.created', { classId: classAId })).toBe(1);

    const s1 = await loadNotifications(orgAId, student1Id);
    expect(s1.unread).toBe(1);
    expect(s1.items[0].title).toContain('Group');
    expect(s1.items[0].link).toBe('/app/assignments');

    const s2 = await loadNotifications(orgAId, student2Id);
    expect(s2.unread).toBe(0);
  });

  it('completing an assignment notifies the class teacher', async () => {
    const assignment = await prisma.classAssignment.findFirst({ where: { classId: classAId } });
    expect(assignment).not.toBeNull();

    await actAs(student1Id);
    const res = await setAssignmentDone({ assignmentId: assignment!.id, done: true });
    expect(res.ok).toBe(true);

    expect(await countEvents('assignment.completed', { studentId: student1Id })).toBe(1);
    const teacher = await loadNotifications(orgAId, teacherAId);
    expect(teacher.unread).toBe(1);
    expect(teacher.items[0].title).toContain('Actor');
    expect(await loadNotifications(orgAId, student2Id).then((n) => n.unread)).toBe(0);
  });

  it('enrolling a student records an event and notifies the student', async () => {
    await actAs(teacherAId);
    const res = await enrollStudent({ classId: classAId, studentId: student2Id });
    expect(res.ok).toBe(true);

    expect(await countEvents('student.enrolled', { studentId: student2Id })).toBe(1);
    const s2 = await loadNotifications(orgAId, student2Id);
    expect(s2.unread).toBe(1);
    expect(s2.items[0].title).toContain('added to');
    expect(s2.items[0].link).toBe(`/app/classes/${classAId}`);
  });

  it('feed visibility: learners only see their classes and org-wide events', async () => {
    const s1Feed = await loadActivityFeed(orgAId, student1Id, false);
    const s1Types = s1Feed.map((e) => e.type);
    expect(s1Types).toContain('assignment.created');
    expect(s1Types).toContain('assignment.completed');
    expect(s1Types).toContain('course.created');
    expect(s1Types).not.toContain('student.enrolled');

    const s3Feed = await loadActivityFeed(orgAId, student3Id, false);
    const s3Types = s3Feed.map((e) => e.type);
    expect(s3Types).toContain('course.created');
    expect(s3Types).toContain('class.created');
    expect(s3Types).not.toContain('assignment.created');
    expect(s3Types).not.toContain('assignment.completed');
    expect(s3Types).not.toContain('student.enrolled');

    const teacherFeed = await loadActivityFeed(orgAId, teacherAId, true);
    const teacherTypes = teacherFeed.map((e) => e.type);
    expect(teacherTypes).toContain('assignment.completed');
    expect(teacherTypes).toContain('student.enrolled');
    expect(teacherTypes).toContain('course.created');
  });

  it('marking read only affects the acting user and supports specific ids', async () => {
    const s1Before = await loadNotifications(orgAId, student1Id);
    expect(s1Before.unread).toBe(1);

    await actAs(student2Id);
    const s2Marked = await markNotificationsRead();
    expect(s2Marked.ok).toBe(true);
    expect(s2Marked.ok && s2Marked.data.marked).toBe(1);
    const s1Still = await loadNotifications(orgAId, student1Id);
    expect(s1Still.unread).toBe(1);

    await actAs(student1Id);
    const all = await markNotificationsRead();
    expect(all.ok && all.data.marked).toBeGreaterThanOrEqual(1);
    expect((await loadNotifications(orgAId, student1Id)).unread).toBe(0);

    await actAs(teacherAId);
    const created = await createAssignment({ classId: classAId, lessonId: l1, dueAt: '2030-01-10' });
    expect(created.ok).toBe(true);
    const s1Fresh = await loadNotifications(orgAId, student1Id);
    expect(s1Fresh.unread).toBe(1);
    const oneId = s1Fresh.items[0].id;

    await actAs(student1Id);
    const specific = await markNotificationsRead({ ids: [oneId] });
    expect(specific.ok && specific.data.marked).toBe(1);
    expect((await loadNotifications(orgAId, student1Id)).unread).toBe(0);
  });

  it('is org-scoped: a foreign user sees nothing from another org', async () => {
    await actAs(foreignId);
    expect(await loadActivityFeed(orgBId, foreignId, true)).toEqual([]);
    expect((await loadNotifications(orgBId, foreignId)).unread).toBe(0);

    const foreignMarked = await markNotificationsRead();
    expect(foreignMarked.ok && foreignMarked.data.marked).toBe(0);
  });
});
