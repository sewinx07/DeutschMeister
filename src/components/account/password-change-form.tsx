'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/client';
import { toast } from 'sonner';

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, startTransition] = useTransition();

  function onChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (error) {
        toast.error(error.message ?? 'Failed to change password.');
      } else {
        toast.success('Password changed.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirm('');
      }
    });
  }

  const valid = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirm;

  return (
    <form onSubmit={onChange} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={pending}
          required
          minLength={8}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <Button type="submit" disabled={pending || !valid}>
        {pending ? 'Changing…' : 'Change password'}
      </Button>
    </form>
  );
}
