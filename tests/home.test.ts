import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/server/db';
import { loadTodayTasks } from '@/lib/server/study';
import { MembershipStatus, Role } from '@/generated/prisma/enums';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe.skipIf(!enabled)('home dashboard today-task loader', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgId = '';
  let ownerId = '';
  let otherOrgId = '';

  beforeAll(async () => {
    if (!enabled) return;
    const org = await prisma.organization.create({ data: { name: `home-${tag}`, slug: `home-${tag}` } });
    orgId = org.id;
    orgIds.push(orgId);
    const other = await prisma.organization.create({ data: { name: `home-${tag}-x`, slug: `home-${tag}-x` } });
    otherOrgId = other.id;
    orgIds.push(otherOrgId);
    const owner = await prisma.user.create({ data: { email: `homeo-${tag}@test`, name: 'Owner' } });
    ownerId = owner.id;
    userIds.push(ownerId);
    await prisma.organizationMember.create({
      data: { orgId, userId: ownerId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
    });

    const learner = await prisma.learnerProfile.create({
      data: {
        orgId,
        userId: ownerId,
        currentLevel: 'A1',
        targetLevel: 'B1',
        examType: 'Other',
        onboarded: true,
      },
    });
    const today = localDayKey(new Date());
    await prisma.studyTask.createMany({
      data: [
        { id: `home-t1-${tag}`, learnerId: learner.id, date: today, skill: 'grammar', title: 'Grammar drill', durationMinutes: 15, difficulty: 2, status: 'pending', type: 'grammar' },
        { id: `home-t2-${tag}`, learnerId: learner.id, date: today, skill: 'vocabulary', title: 'Vocab review', durationMinutes: 10, difficulty: 1, status: 'done', type: 'review', isRest: false },
        { id: `home-t3-${tag}`, learnerId: learner.id, date: '2000-01-01', skill: 'reading', title: 'Old task', durationMinutes: 20, difficulty: 2, status: 'pending', type: 'reading' },
      ],
    });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.studyTask.deleteMany({ where: { learner: { orgId: { in: orgIds } } } });
    await prisma.learnerProfile.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it('returns only today’s tasks in stable order', async () => {
    const tasks = await loadTodayTasks(orgId, ownerId);
    expect(tasks.map((t) => t.title)).toEqual(['Grammar drill', 'Vocab review']);
    expect(tasks[0]).toMatchObject({ skill: 'grammar', durationMinutes: 15, status: 'pending' });
  });

  it('does not create a profile and returns [] when the user has none', async () => {
    const orphan = await prisma.user.create({ data: { email: `homeorphan-${tag}@test`, name: 'Orphan' } });
    userIds.push(orphan.id);
    const before = await prisma.learnerProfile.count({ where: { userId: orphan.id } });
    const tasks = await loadTodayTasks(orgId, orphan.id);
    const after = await prisma.learnerProfile.count({ where: { userId: orphan.id } });
    expect(tasks).toEqual([]);
    expect(before).toBe(0);
    expect(after).toBe(0);
  });

  it('is org-scoped — a learner id in another org yields no tasks', async () => {
    const tasks = await loadTodayTasks(otherOrgId, ownerId);
    expect(tasks).toEqual([]);
  });
});
