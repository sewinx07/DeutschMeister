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

import { updateOrganization, updateProfile } from '@/lib/server/actions/orgs';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('org settings & user profile', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgAId = '';
  let orgBId = '';
  let ownerAId = '';
  let teacherAId = '';
  let studentAId = '';
  let foreignId = '';

  beforeAll(async () => {
    if (!enabled) return;
    const orgA = await prisma.organization.create({ data: { name: `set-${tag}`, slug: `set-${tag}` } });
    const orgB = await prisma.organization.create({ data: { name: `set-${tag}-x`, slug: `set-${tag}-x` } });
    orgAId = orgA.id;
    orgBId = orgB.id;
    orgIds.push(orgAId, orgBId);

    const owner = await prisma.user.create({ data: { email: `seto-${tag}@test.com`, name: 'Owner' } });
    const teacher = await prisma.user.create({ data: { email: `sett-${tag}@test.com`, name: 'Teacher' } });
    const student = await prisma.user.create({ data: { email: `sets-${tag}@test.com`, name: 'Student' } });
    const foreign = await prisma.user.create({ data: { email: `setf-${tag}@test.com`, name: 'Foreign', currentOrganizationId: orgBId } });
    ownerAId = owner.id;
    teacherAId = teacher.id;
    studentAId = student.id;
    foreignId = foreign.id;
    userIds.push(ownerAId, teacherAId, studentAId, foreignId);

    await prisma.organizationMember.createMany({
      data: [
        { orgId: orgAId, userId: ownerAId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: teacherAId, role: Role.TEACHER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: studentAId, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
        { orgId: orgBId, userId: foreignId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
      ],
    });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.notification.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.activityEvent.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.auditLog.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.invitation.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.courseLesson.deleteMany({ where: { topic: { course: { orgId: { in: orgIds } } } } });
    await prisma.courseTopic.deleteMany({ where: { course: { orgId: { in: orgIds } } } });
    await prisma.course.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  async function actAs(userId: string) {
    requireUser.mockResolvedValue({ id: userId, name: 'Actor', email: 'actor@test.com', isPlatformAdmin: false });
  }

  it('owner can update org name and description', async () => {
    await actAs(ownerAId);
    const res = await updateOrganization({ orgId: orgAId, name: 'Renamed Org', description: 'New desc' });
    expect(res.ok).toBe(true);

    const org = await prisma.organization.findUnique({ where: { id: orgAId } });
    expect(org!.name).toBe('Renamed Org');
    expect(org!.description).toBe('New desc');
  });

  it('clears description when set to empty string', async () => {
    await actAs(ownerAId);
    const res = await updateOrganization({ orgId: orgAId, description: '' });
    expect(res.ok).toBe(true);

    const org = await prisma.organization.findUnique({ where: { id: orgAId } });
    expect(org!.description).toBeNull();
  });

  it('teacher cannot update org settings', async () => {
    await actAs(teacherAId);
    const res = await updateOrganization({ orgId: orgAId, name: 'Hacked' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('FORBIDDEN');
  });

  it('rejects name that is too short', async () => {
    await actAs(ownerAId);
    const res = await updateOrganization({ orgId: orgAId, name: 'A' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('VALIDATION');
  });

  it('cannot update a foreign org', async () => {
    await actAs(foreignId);
    const res = await updateOrganization({ orgId: orgAId, name: 'Stolen' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('FORBIDDEN');
  });

  it('user can update their own display name', async () => {
    await actAs(studentAId);
    const res = await updateProfile({ name: 'New Name' });
    expect(res.ok).toBe(true);

    const user = await prisma.user.findUnique({ where: { id: studentAId } });
    expect(user!.name).toBe('New Name');
  });

  it('rejects profile name that is too short', async () => {
    await actAs(studentAId);
    const res = await updateProfile({ name: 'X' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('VALIDATION');
  });

  it('no-op when name is undefined', async () => {
    await actAs(ownerAId);
    const before = await prisma.user.findUnique({ where: { id: ownerAId } });
    const res = await updateProfile({});
    expect(res.ok).toBe(true);

    const after = await prisma.user.findUnique({ where: { id: ownerAId } });
    expect(after!.name).toBe(before!.name);
  });
});
