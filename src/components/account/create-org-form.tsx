'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createOrganization } from '@/lib/server/actions/orgs';
import { toast } from 'sonner';

export function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error('Organization name must be at least 2 characters.');
      return;
    }
    startTransition(async () => {
      const res = await createOrganization({ name: trimmed });
      if (res.ok) {
        toast.success('Organization created.');
        setName('');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="org-name">New organization</Label>
        <Input
          id="org-name"
          placeholder="e.g. Vienna Language School"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create'}
      </Button>
    </form>
  );
}
