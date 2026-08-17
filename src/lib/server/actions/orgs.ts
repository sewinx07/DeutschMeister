'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { MembershipStatus, Role } from '@/generated/prisma/enums';
import { prisma } from '@/lib/server/db';
import { ActionError, toActionError } from '@/lib/server/errors';
import { requireUser } from '@/lib/server/auth-helpers';
import { recordAudit } from '@/lib/server/audit';
import { recordActivity } from '@/lib/server/activity';
import { assertPermission, resolveMembership } from '@/lib/server/tenant';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

const ROLE_VALUES = Object.values(Role);

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org'
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base.slice(0, 34)}-${i++}`;
  }
  return slug;
}

export async function createOrganization(
  input: { name: string; description?: string }
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const user = await requireUser();
    const { name, description } = z
      .object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(120),
        description: z.string().max(500).optional(),
      })
      .parse(input);

    const slug = await uniqueSlug(slugify(name));
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({ data: { name, description: description ?? null, slug } });
      await tx.organizationMember.create({
        data: { orgId: created.id, userId: user.id, role: Role.ORGANIZATION_OWNER },
      });
      await tx.user.update({ where: { id: user.id }, data: { currentOrganizationId: created.id } });
      return created;
    });

    await recordAudit({
      orgId: org.id,
      actorId: user.id,
      action: 'org.created',
      targetType: 'organization',
      targetId: org.id,
      meta: { name: org.name },
    });
    return { ok: true, data: { id: org.id, slug: org.slug } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function switchOrganization(orgId: string): Promise<ActionResult<{ orgId: string }>> {
  try {
    const user = await requireUser();
    const membership = await resolveMembership(user.id, orgId);
    if (!membership) {
      throw new ActionError('FORBIDDEN', 'You do not have access to this organization.');
    }
    await prisma.user.update({ where: { id: user.id }, data: { currentOrganizationId: orgId } });
    revalidatePath('/account');
    return { ok: true, data: { orgId } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function inviteMember(
  input: { orgId: string; email: string; role: Role }
): Promise<ActionResult<{ invitationId: string; inviteUrl: string }>> {
  try {
    const user = await requireUser();
    const { orgId, email, role } = z
      .object({
        orgId: z.string().min(1),
        email: z.string().email('Enter a valid email address'),
        role: z.enum(ROLE_VALUES as [Role, ...Role[]]),
      })
      .parse(input);

    await assertPermission(user.id, orgId, 'member.manage', { isPlatformAdmin: user.isPlatformAdmin });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new ActionError('NOT_FOUND', 'Organization not found.');

    const existingMember = await prisma.organizationMember.findFirst({
      where: { orgId, user: { email } },
    });
    if (existingMember) throw new ActionError('CONFLICT', 'That user is already a member.');
    const existingInvite = await prisma.invitation.findFirst({
      where: { orgId, email, status: 'PENDING' },
    });
    if (existingInvite) throw new ActionError('CONFLICT', 'An invitation for this email is already pending.');

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const invite = await prisma.invitation.create({
      data: { orgId, email, role, token, expiresAt, invitedById: user.id, status: 'PENDING' },
    });

    await recordAudit({
      orgId,
      actorId: user.id,
      action: 'member.invited',
      targetType: 'invitation',
      targetId: invite.id,
      meta: { email, role },
    });
    await recordActivity({
      orgId,
      actorId: user.id,
      type: 'member.invited',
      summary: `invited ${email} as ${role}`,
    });
    return {
      ok: true,
      data: {
        invitationId: invite.id,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${token}`,
      },
    };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const invite = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invite) throw new ActionError('NOT_FOUND', 'Invitation not found.');
    await assertPermission(user.id, invite.orgId, 'member.manage', { isPlatformAdmin: user.isPlatformAdmin });

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });
    await recordAudit({
      orgId: invite.orgId,
      actorId: user.id,
      action: 'member.invitation_revoked',
      targetType: 'invitation',
      targetId: invitationId,
      meta: { email: invite.email },
    });
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function acceptInvitation(token: string): Promise<ActionResult<{ orgId: string; orgName: string }>> {
  try {
    const user = await requireUser();
    const invite = await prisma.invitation.findUnique({ where: { token } });
    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new ActionError('NOT_FOUND', 'This invitation is invalid or has expired.');
    }
    if (invite.inviteeUserId && invite.inviteeUserId !== user.id) {
      throw new ActionError('FORBIDDEN', 'This invitation is not for your account.');
    }
    if (invite.email !== user.email) {
      throw new ActionError('FORBIDDEN', 'Sign in with the email address that was invited.');
    }

    const existing = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
    });
    if (existing) {
      throw new ActionError('CONFLICT', 'You are already a member of this organization.');
    }

    const org = await prisma.$transaction(async (tx) => {
      await tx.organizationMember.create({
        data: { orgId: invite.orgId, userId: user.id, role: invite.role },
      });
      await tx.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date(), inviteeUserId: user.id },
      });
      await tx.user.update({ where: { id: user.id }, data: { currentOrganizationId: invite.orgId } });
      return tx.organization.findUniqueOrThrow({ where: { id: invite.orgId } });
    });

    await recordAudit({
      orgId: invite.orgId,
      actorId: user.id,
      action: 'member.joined',
      targetType: 'organization',
      targetId: invite.orgId,
    });
    await recordActivity({
      orgId: invite.orgId,
      actorId: user.id,
      type: 'member.joined',
      studentId: user.id,
      summary: `joined the organization`,
    });
    return { ok: true, data: { orgId: org.id, orgName: org.name } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function listMembers(
  orgId: string
): Promise<ActionResult<{ id: string; name: string; email: string; role: Role; status: string }[]>> {
  try {
    const user = await requireUser();
    await assertPermission(user.id, orgId, 'member.view', { isPlatformAdmin: user.isPlatformAdmin });
    const members = await prisma.organizationMember.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ok: true,
      data: members.map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        status: m.status,
      })),
    };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function listMemberships(): Promise<
  ActionResult<
    { orgId: string; orgName: string; orgSlug: string; role: Role; status: MembershipStatus; current: boolean }[]
  >
> {
  try {
    const user = await requireUser();
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { org: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ok: true,
      data: memberships.map((m) => ({
        orgId: m.orgId,
        orgName: m.org.name,
        orgSlug: m.org.slug,
        role: m.role,
        status: m.status,
        current: m.orgId === user.currentOrganizationId,
      })),
    };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function removeMember(
  input: { orgId: string; userId: string }
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const { orgId, userId } = z
      .object({ orgId: z.string().min(1), userId: z.string().min(1) })
      .parse(input);
    await assertPermission(user.id, orgId, 'member.manage', { isPlatformAdmin: user.isPlatformAdmin });

    const target = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      include: { user: { select: { name: true } } },
    });
    if (!target) throw new ActionError('NOT_FOUND', 'Member not found.');
    if (target.role === Role.ORGANIZATION_OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: { orgId, role: Role.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE },
      });
      if (ownerCount <= 1) {
        throw new ActionError('CONFLICT', 'An organization must keep at least one owner.');
      }
    }

    await prisma.organizationMember.delete({ where: { orgId_userId: { orgId, userId } } });
    if (user.currentOrganizationId === orgId) {
      const next = await prisma.organizationMember.findFirst({ where: { userId: user.id } });
      await prisma.user.update({
        where: { id: user.id },
        data: { currentOrganizationId: next?.orgId ?? null },
      });
    }
    await recordAudit({
      orgId,
      actorId: user.id,
      action: 'member.removed',
      targetType: 'user',
      targetId: userId,
    });
    await recordActivity({
      orgId,
      actorId: user.id,
      type: 'member.removed',
      studentId: userId,
      summary: `removed ${target.user.name} from the organization`,
    });
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export type InvitationItem = {
  id: string;
  email: string;
  role: Role;
  status: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedBy: string;
  createdAt: Date;
};

export async function listInvitations(
  orgId: string
): Promise<ActionResult<InvitationItem[]>> {
  try {
    const user = await requireUser();
    await assertPermission(user.id, orgId, 'member.view', { isPlatformAdmin: user.isPlatformAdmin });
    const invitations = await prisma.invitation.findMany({
      where: { orgId },
      include: { invitedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      ok: true,
      data: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        token: inv.token,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        invitedBy: inv.invitedBy.name,
        createdAt: inv.createdAt,
      })),
    };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}
