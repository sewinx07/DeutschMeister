import type { OrganizationMember, Role } from '@/generated/prisma/client';
import { MembershipStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/server/db';
import { ActionError } from '@/lib/server/errors';
import { roleHasPermission, type Permission } from '@/lib/server/rbac';

/** Resolve a user's ACTIVE membership in an org. Returns null when absent. */
export async function resolveMembership(
  userId: string,
  orgId: string
): Promise<OrganizationMember | null> {
  return prisma.organizationMember.findFirst({
    where: { orgId, userId, status: MembershipStatus.ACTIVE },
  });
}

/** The user's currently selected organization, if they are an ACTIVE member. */
export async function resolveCurrentOrg(userId: string): Promise<OrganizationMember | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.currentOrganizationId) return null;
  return resolveMembership(userId, user.currentOrganizationId);
}

/** Throws unless the user is an ACTIVE member of the org. Returns the membership. */
export async function assertOrgAccess(userId: string, orgId: string) {
  const membership = await resolveMembership(userId, orgId);
  if (!membership) {
    throw new ActionError('FORBIDDEN', 'You do not have access to this organization.');
  }
  return membership;
}

/**
 * Tenant-isolation gate. Throws unless the user holds `permission` inside the
 * org (platform admins bypass). The org id is always resolved from the
 * server-side session/membership — never from client input.
 */
export async function assertPermission(
  userId: string,
  orgId: string,
  permission: Permission,
  opts: { isPlatformAdmin?: boolean } = {}
) {
  if (opts.isPlatformAdmin) return;
  const membership = await assertOrgAccess(userId, orgId);
  if (!roleHasPermission(membership.role as Role, permission)) {
    throw new ActionError('FORBIDDEN', 'You are not allowed to perform this action.');
  }
}
