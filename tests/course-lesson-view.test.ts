import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/server/db';
import { loadCourseLesson } from '@/lib/server/course-lessons';
import { MembershipStatus, Role } from '@/generated/prisma/enums';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('course lesson viewer loader', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgId = '';
  let ownerId = '';
  let courseId = '';
  let unpublishedCourseId = '';
  let lessonA = '';
  let lessonB = '';
  let lessonC = '';
  let lessonDraft = '';

  beforeAll(async () => {
    if (!enabled) return;
    const org = await prisma.organization.create({ data: { name: `clv-${tag}`, slug: `clv-${tag}` } });
    orgId = org.id;
    orgIds.push(orgId);
    const owner = await prisma.user.create({ data: { email: `clvo-${tag}@test`, name: 'Owner' } });
    ownerId = owner.id;
    userIds.push(ownerId);
    await prisma.organizationMember.create({
      data: { orgId, userId: ownerId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
    });

    const course = await prisma.course.create({
      data: { orgId, title: 'Viewer Course', subject: 'german', published: true },
      include: { topics: true },
    });
    courseId = course.id;
    const unpublished = await prisma.course.create({
      data: { orgId, title: 'Draft Course', subject: 'german', published: false },
    });
    unpublishedCourseId = unpublished.id;
    const draftTopic = await prisma.courseTopic.create({ data: { courseId: unpublishedCourseId, title: 'Draft Topic', order: 0 } });
    const draftLesson = await prisma.courseLesson.create({ data: { topicId: draftTopic.id, order: 0, title: 'Draft Lesson', kind: 'reading' } });
    lessonDraft = draftLesson.id;

    const topic = await prisma.courseTopic.create({ data: { courseId, title: 'Topic 1', order: 0 } });
    const topic2 = await prisma.courseTopic.create({ data: { courseId, title: 'Topic 2', order: 1 } });
    const a = await prisma.courseLesson.create({ data: { topicId: topic.id, order: 0, title: 'Lesson A', kind: 'reading', content: { heading: 'Hi', body: 'hello' } } });
    const b = await prisma.courseLesson.create({ data: { topicId: topic.id, order: 1, title: 'Lesson B', kind: 'grammar' } });
    const c = await prisma.courseLesson.create({ data: { topicId: topic2.id, order: 0, title: 'Lesson C', kind: 'listening', minutes: 15 } });
    lessonA = a.id;
    lessonB = b.id;
    lessonC = c.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.courseLesson.deleteMany({ where: { topic: { course: { orgId: { in: orgIds } } } } });
    await prisma.courseTopic.deleteMany({ where: { course: { orgId: { in: orgIds } } } });
    await prisma.course.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it('returns the lesson with content, topic and sibling navigation', async () => {
    const view = await loadCourseLesson(orgId, courseId, lessonA, { canManage: false });
    expect(view).not.toBeNull();
    expect(view?.course.title).toBe('Viewer Course');
    expect(view?.topic.title).toBe('Topic 1');
    expect(view?.lesson.title).toBe('Lesson A');
    expect(view?.lesson.content).toEqual({ heading: 'Hi', body: 'hello' });
    expect(view?.prev).toBeNull();
    expect(view?.next).toEqual({ id: lessonB, title: 'Lesson B' });
  });

  it('navigates between topics and to the previous sibling', async () => {
    const view = await loadCourseLesson(orgId, courseId, lessonC, { canManage: false });
    expect(view?.topic.title).toBe('Topic 2');
    expect(view?.topic.order).toBe(1);
    expect(view?.prev).toEqual({ id: lessonB, title: 'Lesson B' });
    expect(view?.next).toBeNull();
  });

  it('returns null for a course outside the org', async () => {
    const otherOrg = await prisma.organization.create({ data: { name: `clv-${tag}-x`, slug: `clv-${tag}-x` } });
    orgIds.push(otherOrg.id);
    const view = await loadCourseLesson(otherOrg.id, courseId, lessonA, { canManage: true });
    expect(view).toBeNull();
  });

  it('hides unpublished courses from non-managers but allows managers', async () => {
    const denied = await loadCourseLesson(orgId, unpublishedCourseId, lessonDraft, { canManage: false });
    expect(denied).toBeNull();
    const allowed = await loadCourseLesson(orgId, unpublishedCourseId, lessonDraft, { canManage: true });
    expect(allowed?.lesson.title).toBe('Draft Lesson');
  });

  it('returns null for a missing lesson', async () => {
    const view = await loadCourseLesson(orgId, courseId, 'does-not-exist', { canManage: false });
    expect(view).toBeNull();
  });
});
