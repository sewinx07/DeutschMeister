import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/server/db';
import { MembershipStatus, Role } from '@/generated/prisma/enums';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/server/audit', () => ({ recordAudit: vi.fn() }));

const { requireUser } = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock('@/lib/server/auth-helpers', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/server/auth-helpers')>();
  return { ...mod, requireUser };
});

import {
  createCourse,
  createLesson,
  createTopic,
  deleteLesson,
  deleteTopic,
  moveLesson,
  moveTopic,
  updateLesson,
  updateTopic,
} from '@/lib/server/actions/courses';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('course authoring actions', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  const courseIds: string[] = [];
  let orgAId = '';
  let orgBId = '';
  let ownerAId = '';
  let ownerBId = '';

  beforeAll(async () => {
    if (!enabled) return;
    const orgA = await prisma.organization.create({ data: { name: `aua-${tag}`, slug: `aua-${tag}` } });
    const orgB = await prisma.organization.create({ data: { name: `aub-${tag}`, slug: `aub-${tag}` } });
    orgAId = orgA.id;
    orgBId = orgB.id;
    orgIds.push(orgAId, orgBId);
    const oa = await prisma.user.create({ data: { email: `aoa-${tag}@test`, name: 'Owner A' } });
    const ob = await prisma.user.create({ data: { email: `aob-${tag}@test`, name: 'Owner B' } });
    ownerAId = oa.id;
    ownerBId = ob.id;
    userIds.push(ownerAId, ownerBId);
    await prisma.organizationMember.createMany({
      data: [
        { orgId: orgAId, userId: ownerAId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
        { orgId: orgBId, userId: ownerBId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
      ],
    });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.classEnrollment.deleteMany({ where: { class: { orgId: { in: orgIds } } } });
    await prisma.class.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.courseLesson.deleteMany({ where: { topic: { course: { orgId: { in: orgIds } } } } });
    await prisma.courseTopic.deleteMany({ where: { course: { orgId: { in: orgIds } } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  async function actAs(userId: string) {
    requireUser.mockResolvedValue({ id: userId, name: 'Actor', email: 'actor@test', isPlatformAdmin: false });
  }

  async function makeCourse(): Promise<string> {
    const res = await createCourse({ orgId: orgAId, title: `Authoring ${tag}`, subject: 'german' });
    if (!res.ok) throw new Error(res.error.message);
    courseIds.push(res.data.id);
    return res.data.id;
  }

  it('createTopic + updateTopic: titles/descriptions are editable, org-scoped', async () => {
    await actAs(ownerAId);
    const courseId = await makeCourse();

    const created = await createTopic({ courseId, title: 'T1' });
    expect(created.ok).toBe(true);
    const topicId = created.ok ? created.data.id : '';
    expect(topicId).toBeTruthy();

    const updated = await updateTopic({ topicId, title: 'T1 renamed', description: 'intro' });
    expect(updated.ok).toBe(true);
    const row = await prisma.courseTopic.findUnique({ where: { id: topicId } });
    expect(row?.title).toBe('T1 renamed');
    expect(row?.description).toBe('intro');

    await actAs(ownerBId);
    const denied = await updateTopic({ topicId, title: 'Sneaky' });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe('FORBIDDEN');
  });

  it('moveTopic swaps orders with the neighbour', async () => {
    await actAs(ownerAId);
    const courseId = await makeCourse();
    const ids: string[] = [];
    for (const t of ['first', 'second', 'third']) {
      const res = await createTopic({ courseId, title: t });
      if (!res.ok) throw new Error(res.error.message);
      ids.push(res.data.id);
    }

    const moved = await moveTopic({ topicId: ids[1], direction: 'down' });
    expect(moved.ok).toBe(true);
    const rows = await prisma.courseTopic.findMany({ where: { courseId }, orderBy: { order: 'asc' } });
    expect(rows.map((r) => r.title)).toEqual(['first', 'third', 'second']);

    await moveTopic({ topicId: ids[1], direction: 'up' });
    const rows2 = await prisma.courseTopic.findMany({ where: { courseId }, orderBy: { order: 'asc' } });
    expect(rows2.map((r) => r.title)).toEqual(['first', 'second', 'third']);
  });

  it('createLesson + updateLesson round-trips JSON content and can clear it', async () => {
    await actAs(ownerAId);
    const courseId = await makeCourse();
    const topic = await createTopic({ courseId, title: 'Topic' });
    if (!topic.ok) throw new Error(topic.error.message);

    const created = await createLesson({
      topicId: topic.data.id,
      title: 'Intro lesson',
      kind: 'reading',
      minutes: 20,
      content: { heading: 'Hallo', items: ['a', 'b'] },
    });
    expect(created.ok).toBe(true);
    const lessonId = created.ok ? created.data.id : '';

    const updated = await updateLesson({ lessonId, title: 'Intro v2', kind: 'reading', minutes: 25 });
    expect(updated.ok).toBe(true);
    let row = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
    expect(row?.title).toBe('Intro v2');
    expect(row?.minutes).toBe(25);
    expect(row?.content).toEqual({ heading: 'Hallo', items: ['a', 'b'] });

    const cleared = await updateLesson({ lessonId, title: 'Intro v2', kind: 'reading', minutes: 25, content: null });
    expect(cleared.ok).toBe(true);
    row = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
    expect(row?.content).toBeNull();
  });

  it('moveLesson reorders within a topic; deleteLesson removes the row', async () => {
    await actAs(ownerAId);
    const courseId = await makeCourse();
    const topic = await createTopic({ courseId, title: 'Topic' });
    if (!topic.ok) throw new Error(topic.error.message);

    const ids: string[] = [];
    for (const [title, kind] of [['L1', 'reading'], ['L2', 'grammar'], ['L3', 'listening']] as const) {
      const res = await createLesson({ topicId: topic.data.id, title, kind });
      if (!res.ok) throw new Error(res.error.message);
      ids.push(res.data.id);
    }

    const moved = await moveLesson({ lessonId: ids[1], direction: 'down' });
    expect(moved.ok).toBe(true);
    const rows = await prisma.courseLesson.findMany({ where: { topicId: topic.data.id }, orderBy: { order: 'asc' } });
    expect(rows.map((r) => r.title)).toEqual(['L1', 'L3', 'L2']);

    const deleted = await deleteLesson({ lessonId: ids[2] });
    expect(deleted.ok).toBe(true);
    const remaining = await prisma.courseLesson.count({ where: { topicId: topic.data.id } });
    expect(remaining).toBe(2);
  });

  it('deleteTopic cascades its lessons', async () => {
    await actAs(ownerAId);
    const courseId = await makeCourse();
    const topic = await createTopic({ courseId, title: 'Doomed' });
    if (!topic.ok) throw new Error(topic.error.message);
    await createLesson({ topicId: topic.data.id, title: 'x1', kind: 'reading' });
    await createLesson({ topicId: topic.data.id, title: 'x2', kind: 'reading' });

    const res = await deleteTopic({ topicId: topic.data.id });
    expect(res.ok).toBe(true);
    const topicCount = await prisma.courseTopic.count({ where: { id: topic.data.id } });
    const lessonCount = await prisma.courseLesson.count({ where: { topicId: topic.data.id } });
    expect(topicCount).toBe(0);
    expect(lessonCount).toBe(0);
  });
});
