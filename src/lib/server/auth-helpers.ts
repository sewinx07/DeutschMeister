import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { ActionError } from '@/lib/server/errors';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  isPlatformAdmin: boolean;
  currentOrganizationId: string | null;
};

export const getServerSession = cache(async () => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  return session;
});

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    image: session.user.image ?? null,
    isPlatformAdmin: Boolean(session.user.isPlatformAdmin),
    currentOrganizationId: session.user.currentOrganizationId || null,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new ActionError('UNAUTHORIZED', 'You must be signed in to do this.');
  return user;
}
