'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { markNotificationsRead } from '@/lib/server/actions/notifications';
import { toast } from 'sonner';

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAll() {
    startTransition(async () => {
      const res = await markNotificationsRead();
      if (res.ok) {
        toast.success('All notifications marked as read.');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={markAll} disabled={pending || disabled}>
      {pending ? 'Marking…' : 'Mark all read'}
    </Button>
  );
}
