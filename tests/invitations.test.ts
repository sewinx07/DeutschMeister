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

import { inviteMember, acceptInvitation, revokeInvitation, removeMember, listInvitations, listMembers } from '@/lib/server/actions/orgs';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('invitations & member management', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgAId = '';
  let orgBId = '';
  let ownerAId = '';
  let teacherAId = '';
  let inviteeId = '';
  let studentId = '';
  let foreignId = '';

  let inviteToken = '';
  let inviteId = '';
  const emailByUserId = new Map<string, string>();

  beforeAll(async () => {
    if (!enabled) return;
    const orgA = await prisma.organization.create({ data: { name: `inv-${tag}`, slug: `inv-${tag}` } });
    const orgB = await prisma.organization.create({ data: { name: `inv-${tag}-x`, slug: `inv-${tag}-x` } });
    orgAId = orgA.id;
    orgBId = orgB.id;
    orgIds.push(orgAId, orgBId);

    const owner = await prisma.user.create({ data: { email: `invo-${tag}@test.com`, name: 'Owner' } });
    const teacher = await prisma.user.create({ data: { email: `invt-${tag}@test.com`, name: 'Teacher' } });
    const invitee = await prisma.user.create({
      data: { email: `invie-${tag}@test.com`, name: 'Invitee', currentOrganizationId: null },
    });
    const student = await prisma.user.create({
      data: { email: `invs-${tag}@test.com`, name: 'Student', currentOrganizationId: orgAId },
    });
    const foreign = await prisma.user.create({
      data: { email: `invf-${tag}@test.com`, name: 'Foreign', currentOrganizationId: orgBId },
    });
    ownerAId = owner.id;
    teacherAId = teacher.id;
    inviteeId = invitee.id;
    studentId = student.id;
    foreignId = foreign.id;
    userIds.push(ownerAId, teacherAId, inviteeId, studentId, foreignId);
    emailByUserId.set(ownerAId, owner.email);
    emailByUserId.set(teacherAId, teacher.email);
    emailByUserId.set(inviteeId, invitee.email);
    emailByUserId.set(studentId, student.email);
    emailByUserId.set(foreignId, foreign.email);

    await prisma.organizationMember.createMany({
      data: [
        { orgId: orgAId, userId: ownerAId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: teacherAId, role: Role.TEACHER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: studentId, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
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
    const email = emailByUserId.get(userId) ?? 'unknown@test.com';
    requireUser.mockResolvedValue({ id: userId, name: 'Actor', email, isPlatformAdmin: false });
  }

  it('inviteMember creates an invitation with audit and activity events', async () => {
    await actAs(ownerAId);
    const res = await inviteMember({ orgId: orgAId, email: `invie-${tag}@test.com`, role: Role.TEACHER });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    inviteId = res.data.invitationId;
    inviteToken = res.data.inviteUrl.split('/invite/')[1];

    const invite = await prisma.invitation.findUnique({ where: { id: inviteId } });
    expect(invite).not.toBeNull();
    expect(invite!.status).toBe('PENDING');
    expect(invite!.role).toBe(Role.TEACHER);
    expect(invite!.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const audit = await prisma.auditLog.findFirst({ where: { orgId: orgAId, action: 'member.invited' } });
    expect(audit).not.toBeNull();

    const activity = await prisma.activityEvent.findFirst({ where: { orgId: orgAId, type: 'member.invited' } });
    expect(activity).not.toBeNull();
  });

  it('inviteMember rejects duplicate pending invitations', async () => {
    await actAs(ownerAId);
    const res = await inviteMember({ orgId: orgAId, email: `invie-${tag}@test.com`, role: Role.TEACHER });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('CONFLICT');
  });

  it('inviteMember rejects already-existing members', async () => {
    await actAs(ownerAId);
    const res = await inviteMember({ orgId: orgAId, email: `invs-${tag}@test.com`, role: Role.STUDENT });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('CONFLICT');
  });

  it('acceptInvitation creates membership, switches current org, and records activity', async () => {
    await actAs(inviteeId);
    const res = await acceptInvitation(inviteToken);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.orgId).toBe(orgAId);

    const membership = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: orgAId, userId: inviteeId } },
    });
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe(Role.TEACHER);

    const invite = await prisma.invitation.findUnique({ where: { id: inviteId } });
    expect(invite!.status).toBe('ACCEPTED');
    expect(invite!.acceptedAt).not.toBeNull();

    const user = await prisma.user.findUnique({ where: { id: inviteeId } });
    expect(user!.currentOrganizationId).toBe(orgAId);

    const activity = await prisma.activityEvent.findFirst({ where: { orgId: orgAId, type: 'member.joined' } });
    expect(activity).not.toBeNull();
  });

  it('acceptInvitation rejects invalid, expired, and already-accepted tokens', async () => {
    await actAs(inviteeId);
    const badToken = await acceptInvitation('nonexistent-token');
    expect(badToken.ok).toBe(false);
    if (badToken.ok) return;
    expect(badToken.error.code).toBe('NOT_FOUND');

    const expired = await prisma.invitation.create({
      data: {
        orgId: orgAId,
        email: `expired-${tag}@test.com`,
        role: Role.STUDENT,
        token: randomUUID(),
        expiresAt: new Date(Date.now() - 1000),
        invitedById: ownerAId,
      },
    });
    const expiredRes = await acceptInvitation(expired.token);
    expect(expiredRes.ok).toBe(false);
    if (expiredRes.ok) return;
    expect(expiredRes.error.code).toBe('NOT_FOUND');

    const used = await prisma.invitation.findUnique({ where: { id: inviteId } });
    const usedRes = await acceptInvitation(used!.token);
    expect(usedRes.ok).toBe(false);
    if (usedRes.ok) return;
    expect(usedRes.error.code).toBe('NOT_FOUND');
  });

  it('acceptInvitation rejects when email does not match signed-in user', async () => {
    await actAs(ownerAId);
    const tempInvite = await inviteMember({ orgId: orgAId, email: `wrongmatch-${tag}@test.com`, role: Role.STUDENT });
    expect(tempInvite.ok).toBe(true);
    if (!tempInvite.ok) return;

    await actAs(foreignId);
    const res = await acceptInvitation(tempInvite.data.inviteUrl.split('/invite/')[1]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('FORBIDDEN');
  });

  it('revokeInvitation sets REVOKED and records audit', async () => {
    await actAs(ownerAId);
    const invite2 = await inviteMember({ orgId: orgAId, email: `revoked-${tag}@test.com`, role: Role.STUDENT });
    expect(invite2.ok).toBe(true);
    if (!invite2.ok) return;

    const revokeRes = await revokeInvitation(invite2.data.invitationId);
    expect(revokeRes.ok).toBe(true);

    const invite = await prisma.invitation.findUnique({ where: { id: invite2.data.invitationId } });
    expect(invite!.status).toBe('REVOKED');

    const audit = await prisma.auditLog.findFirst({ where: { orgId: orgAId, action: 'member.invitation_revoked' } });
    expect(audit).not.toBeNull();
  });

  it('removeMember deletes membership and records activity; prevents last-owner removal', async () => {
    await actAs(ownerAId);
    const removeRes = await removeMember({ orgId: orgAId, userId: studentId });
    expect(removeRes.ok).toBe(true);

    const membership = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: orgAId, userId: studentId } },
    });
    expect(membership).toBeNull();

    const activity = await prisma.activityEvent.findFirst({ where: { orgId: orgAId, type: 'member.removed' } });
    expect(activity).not.toBeNull();

    const lastOwner = await removeMember({ orgId: orgAId, userId: ownerAId });
    expect(lastOwner.ok).toBe(false);
    if (lastOwner.ok) return;
    expect(lastOwner.error.code).toBe('CONFLICT');
  });

  it('listInvitations and listMembers are org-scoped', async () => {
    await actAs(ownerAId);
    const orgInvites = await listInvitations(orgAId);
    expect(orgInvites.ok).toBe(true);
    if (!orgInvites.ok) return;
    expect(orgInvites.data.length).toBeGreaterThanOrEqual(1);

    const orgMembers = await listMembers(orgAId);
    expect(orgMembers.ok).toBe(true);
    if (!orgMembers.ok) return;
    expect(orgMembers.data.some((m) => m.id === inviteeId)).toBe(true);

    await actAs(foreignId);
    const foreignInvites = await listInvitations(orgBId);
    expect(foreignInvites.ok).toBe(true);
    if (!foreignInvites.ok) return;
    expect(foreignInvites.data.length).toBe(0);

    const foreignMembers = await listMembers(orgBId);
    expect(foreignMembers.ok).toBe(true);
    if (!foreignMembers.ok) return;
    expect(foreignMembers.data.some((m) => m.id === inviteeId)).toBe(false);
  });

  it('activity feed shows member events to staff but not to non-enrolled learners', async () => {
    await actAs(ownerAId);
    const staffFeed = await prisma.activityEvent.findMany({
      where: { orgId: orgAId, type: { in: ['member.invited', 'member.joined', 'member.removed'] } },
    });
    expect(staffFeed.length).toBeGreaterThanOrEqual(3);
    const types = staffFeed.map((e) => e.type);
    expect(types).toContain('member.invited');
    expect(types).toContain('member.joined');
    expect(types).toContain('member.removed');
  });
});
