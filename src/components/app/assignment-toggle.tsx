'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setAssignmentDone } from '@/lib/server/actions/assignments';
import { toast } from 'sonner';

export function AssignmentToggle({ assignmentId, done }: { assignmentId: string; done: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await setAssignmentDone({ assignmentId, done: !done });
      if (res.ok) {
        toast.success(done ? 'Marked as not done.' : 'Assignment completed.');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <Button size="sm" variant={done ? 'outline' : 'default'} disabled={pending} onClick={toggle}>
      {done && <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-600" />}
      {done ? 'Done' : 'Mark done'}
    </Button>
  );
}
