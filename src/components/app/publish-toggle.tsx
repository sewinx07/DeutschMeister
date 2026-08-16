'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setCoursePublished } from '@/lib/server/actions/courses';
import { toast } from 'sonner';

export function PublishToggle({ courseId, published }: { courseId: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={published ? 'outline' : 'default'}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await setCoursePublished({ courseId, published: !published });
          if (res.ok) {
            toast.success(published ? 'Course unpublished.' : 'Course published.');
            router.refresh();
          } else {
            toast.error(res.error.message);
          }
        })
      }
    >
      {published ? 'Unpublish' : 'Publish'}
    </Button>
  );
}
