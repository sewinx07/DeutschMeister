'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { inviteMember, removeMember } from '@/lib/server/actions/orgs';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'INDIVIDUAL_LEARNER', label: 'Individual learner' },
  { value: 'ORGANIZATION_ADMIN', label: 'Admin' },
  { value: 'ORGANIZATION_OWNER', label: 'Owner' },
];

export function MembersPanel({
  orgId,
  currentUserId,
  members,
  canInvite,
  canRemove,
}: {
  orgId: string;
  currentUserId: string;
  members: { id: string; name: string; email: string; role: string; roleKey: string }[];
  canInvite: boolean;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [pending, startTransition] = useTransition();

  function onInvite(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await inviteMember({ orgId, email, role: role as never });
      if (res.ok) {
        toast.success('Invitation created.', {
          description: res.data.inviteUrl,
          duration: 8000,
        });
        setEmail('');
      } else {
        toast.error(res.error.message);
      }
    });
  }

  function onRemove(userId: string, name: string) {
    startTransition(async () => {
      const res = await removeMember({ orgId, userId });
      if (res.ok) {
        toast.success(`${name} removed.`);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y">
        {members.length === 0 && <li className="py-2 text-sm text-muted-foreground">No members yet.</li>}
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {m.name}
                {m.id === currentUserId && <span className="text-muted-foreground"> (you)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">{m.role}</span>
              {canRemove && m.id !== currentUserId && (
                <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={() => onRemove(m.id, m.name)}>
                  Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canInvite && (
        <form onSubmit={onInvite} className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              required
            />
          </div>
          <div className="grid w-full gap-1.5 sm:w-52">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={pending}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Inviting…' : 'Invite'}
          </Button>
        </form>
      )}
    </div>
  );
}
