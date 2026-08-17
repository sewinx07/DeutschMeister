import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/server/auth-helpers';
import { listMembers, listMemberships, listInvitations } from '@/lib/server/actions/orgs';
import { roleHasPermission } from '@/lib/server/rbac';
import { CreateOrgForm } from '@/components/account/create-org-form';
import { OrgSwitcher } from '@/components/account/org-switcher';
import { MembersPanel } from '@/components/account/members-panel';

export const metadata = {
  title: 'Account',
  description: 'Manage your Lernio account and organizations.',
};

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform admin',
  ORGANIZATION_OWNER: 'Owner',
  ORGANIZATION_ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  INDIVIDUAL_LEARNER: 'Individual learner',
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const memberships = await listMemberships();
  const currentOrg = memberships.ok ? memberships.data.find((m) => m.current) : undefined;
  const canManageMembers =
    !!currentOrg && roleHasPermission(currentOrg.role as Parameters<typeof roleHasPermission>[0], 'member.manage');
  const canInvite = canManageMembers;

  const members = currentOrg ? await listMembers(currentOrg.orgId) : null;
  const invitations = currentOrg ? await listInvitations(currentOrg.orgId) : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Your profile, organizations and team members.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Profile
            {user.isPlatformAdmin && <Badge variant="secondary">Platform admin</Badge>}
          </CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{user.name}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{user.email}</span>
          {user.currentOrganizationId && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Current org: {currentOrg?.orgName ?? '—'}</span>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizations</CardTitle>
          <CardDescription>
            Create an organization or switch between the ones you belong to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrgSwitcher
            memberships={
              memberships.ok
                ? memberships.data.map((m) => ({
                    orgId: m.orgId,
                    orgName: m.orgName,
                    role: ROLE_LABEL[m.role] ?? m.role,
                    current: m.current,
                  }))
                : []
            }
          />
          <div className="border-t pt-4">
            <CreateOrgForm />
          </div>
        </CardContent>
      </Card>

      {currentOrg && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Members · {currentOrg.orgName}
              <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                {ROLE_LABEL[currentOrg.role]}
              </span>
            </CardTitle>
            <CardDescription>Everyone with access to this organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <MembersPanel
              orgId={currentOrg.orgId}
              currentUserId={user.id}
              members={
                members?.ok
                  ? members.data.map((m) => ({
                      id: m.id,
                      name: m.name,
                      email: m.email,
                      role: ROLE_LABEL[m.role] ?? m.role,
                      roleKey: m.role,
                    }))
                  : []
              }
              invitations={
                invitations?.ok
                  ? invitations.data.map((inv) => ({
                      id: inv.id,
                      email: inv.email,
                      role: ROLE_LABEL[inv.role] ?? inv.role,
                      status: inv.status,
                      token: inv.token,
                      expiresAt: inv.expiresAt.toISOString(),
                      invitedBy: inv.invitedBy,
                      createdAt: inv.createdAt.toISOString(),
                    }))
                  : []
              }
              canInvite={canInvite}
              canRemove={canManageMembers}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
