import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/server/db';
import { MembershipStatus, Role } from '@/generated/prisma/enums';
import { ActionError } from '@/lib/server/errors';
import { assertOrgAccess, assertPermission, resolveMembership } from '@/lib/server/tenant';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('tenant isolation', () => {
  const tag = randomUUID().slice(0, 8);
  const orgs: string[] = [];
  const users: string[] = [];

  async function makeOrg(name: string) {
    const org = await prisma.organization.create({
      data: { name, slug: `${name}-${tag}` },
    });
    orgs.push(org.id);
    return org;
  }

  async function makeUser(email: string, opts: { isPlatformAdmin?: boolean } = {}) {
    const user = await prisma.user.create({
      data: { email: `${tag}-${email}`, name: email, isPlatformAdmin: opts.isPlatformAdmin ?? false },
    });
    users.push(user.id);
    return user;
  }

  async function join(userId: string, orgId: string, role: Role) {
    return prisma.organizationMember.create({
      data: { userId, orgId, role, status: MembershipStatus.ACTIVE },
    });
  }

  beforeAll(async () => {
    if (!enabled) return;
    const orgA = await makeOrg('alpha');
    const orgB = await makeOrg('beta');
    const ownerA = await makeUser('owner-a');
    const ownerB = await makeUser('owner-b');
    const studentA = await makeUser('student-a');
    const outsider = await makeUser('outsider');
    const admin = await makeUser('admin', { isPlatformAdmin: true });

    await join(ownerA.id, orgA.id, Role.ORGANIZATION_OWNER);
    await join(ownerB.id, orgB.id, Role.ORGANIZATION_OWNER);
    await join(studentA.id, orgA.id, Role.STUDENT);

    // cross-tenant identifiers for assertions
    (globalThis as Record<string, unknown>).__t = {
      orgAId: orgA.id,
      orgBId: orgB.id,
      ownerAId: ownerA.id,
      ownerBId: ownerB.id,
      studentAId: studentA.id,
      outsiderId: outsider.id,
      adminId: admin.id,
    };
  });

  afterAll(async () => {
    if (!enabled) return;
    const { orgAId, orgBId } = (globalThis as Record<string, unknown>).__t as Record<string, string>;
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
    await prisma.$disconnect();
  });

  it('a member can access their own org', async () => {
    const { ownerAId, orgAId } = (globalThis as Record<string, unknown>).__t as Record<string, string>;
    const membership = await assertOrgAccess(ownerAId, orgAId);
    expect(membership.role).toBe(Role.ORGANIZATION_OWNER);
  });

  it('an outsider cannot access a foreign org', async () => {
    const { outsiderId, orgAId } = (globalThis as Record<string, unknown>).__t as Record<string, string>;
    await expect(assertOrgAccess(outsiderId, orgAId)).rejects.toBeInstanceOf(ActionError);
    expect(await resolveMembership(outsiderId, orgAId)).toBeNull();
  });

  it('org A owners cannot manage org B (cross-tenant denial)', async () => {
    const { ownerAId, orgBId } = (globalThis as Record<string, unknown>).__t as Record<string, string>;
    await expect(assertPermission(ownerAId, orgBId, 'member.manage')).rejects.toBeInstanceOf(ActionError);
  });

  it('students cannot manage members even inside their own org', async () => {
    const { studentAId, orgAId } = (globalThis as Record<string, unknown>).__t as Record<string, string>;
    await expect(assertPermission(studentAId, orgAId, 'member.manage')).rejects.toBeInstanceOf(ActionError);
  });

  it('students keep read access inside their own org', async () => {
    const { studentAId, orgAId } = (globalThis as Record<string, unknown>).__t as Record<string, string>;
    await expect(assertPermission(studentAId, orgAId, 'course.view')).resolves.toBeUndefined();
  });

  it('a user never sees members of a different org through their role', async () => {
    const { ownerAId, ownerBId, orgAId, orgBId } = (globalThis as Record<string, unknown>).__t as Record<string, string>;
    const inA = await resolveMembership(ownerAId, orgAId);
    const inB = await resolveMembership(ownerBId, orgAId);
    expect(inA).not.toBeNull();
    expect(inB).toBeNull();
    expect(inA?.orgId).toBe(orgAId);
    expect(inA?.orgId).not.toBe(orgBId);
  });

  it('platform admins bypass tenant + permission checks', async () => {
    const { adminId, orgBId } = (globalThis as Record<string, unknown>).__t as Record<string, string>;
    await expect(assertPermission(adminId, orgBId, 'member.manage', { isPlatformAdmin: true })).resolves.toBeUndefined();
  });
});
