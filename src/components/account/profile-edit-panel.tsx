'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from '@/lib/server/actions/orgs';
import { toast } from 'sonner';

export function ProfileEditPanel({ userName }: { userName: string }) {
  const router = useRouter();
  const [name, setName] = useState(userName);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfile({ name });
      if (res.ok) {
        toast.success('Profile updated.');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  const changed = name !== userName;

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="profile-name">Display name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <Button type="submit" disabled={pending || !changed}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
