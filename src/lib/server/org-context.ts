import { redirect } from 'next/navigation';
import { prisma } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth-helpers';
import { resolveCurrentOrg } from '@/lib/server/tenant';
import type { Role } from '@/generated/prisma/enums';

export type OrgContext = {
  user: {
    id: string;
    name: string;
    email: string;
    isPlatformAdmin: boolean;
  };
  org: { id: string; name: string; slug: string };
  role: Role;
};

/** Signed-in user + their currently selected org membership, or redirect. */
export async function requireOrgContext(): Promise<OrgContext> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const membership = await resolveCurrentOrg(user.id);
  if (!membership) redirect('/account');

  const org = await prisma.organization.findUnique({ where: { id: membership.orgId } });
  if (!org) redirect('/account');

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
    },
    org: { id: org.id, name: org.name, slug: org.slug },
    role: membership.role as Role,
  };
}
