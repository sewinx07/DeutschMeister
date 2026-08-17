'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateOrganization } from '@/lib/server/actions/orgs';
import { toast } from 'sonner';

export function OrgSettingsPanel({
  orgId,
  orgName,
  orgDescription,
  orgSlug,
}: {
  orgId: string;
  orgName: string;
  orgDescription: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(orgName);
  const [description, setDescription] = useState(orgDescription);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateOrganization({ orgId, name, description });
      if (res.ok) {
        toast.success('Organization updated.');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  const changed = name !== orgName || description !== orgDescription;

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="org-slug">Slug</Label>
        <Input id="org-slug" value={orgSlug} disabled readOnly className="opacity-60" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="org-desc">Description</Label>
        <Textarea
          id="org-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={pending || !changed}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
