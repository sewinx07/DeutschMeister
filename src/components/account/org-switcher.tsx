'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { switchOrganization } from '@/lib/server/actions/orgs';
import { toast } from 'sonner';

export function OrgSwitcher({
  memberships,
}: {
  memberships: { orgId: string; orgName: string; role: string; current: boolean }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (memberships.length === 0) {
    return <p className="text-sm text-muted-foreground">You are not in any organization yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {memberships.map((m) => (
        <li
          key={m.orgId}
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{m.orgName}</p>
            <p className="text-xs text-muted-foreground">{m.role}</p>
          </div>
          {m.current ? (
            <BadgeCurrent />
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await switchOrganization(m.orgId);
                  if (res.ok) {
                    toast.success(`Switched to ${m.orgName}`);
                    router.refresh();
                  } else {
                    toast.error(res.error.message);
                  }
                })
              }
            >
              Switch
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function BadgeCurrent() {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      Current
    </span>
  );
}
