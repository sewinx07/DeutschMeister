'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteTopic, moveTopic, updateTopic } from '@/lib/server/actions/courses';
import { toast } from 'sonner';

export function TopicEditor({
  topic,
  canMoveUp,
  canMoveDown,
}: {
  topic: { id: string; title: string; description: string | null; lessonCount: number };
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(topic.title);
  const [description, setDescription] = useState(topic.description ?? '');
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateTopic({ topicId: topic.id, title: title.trim(), description: description.trim() });
      if (res.ok) {
        toast.success('Topic updated.');
        setEditing(false);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  function onMove(direction: 'up' | 'down') {
    startTransition(async () => {
      const res = await moveTopic({ topicId: topic.id, direction });
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  function onDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteTopic({ topicId: topic.id });
      if (res.ok) {
        toast.success('Topic deleted.');
        router.refresh();
      } else {
        toast.error(res.error.message);
        setConfirming(false);
      }
    });
  }

  if (editing) {
    return (
      <form onSubmit={onSave} className="space-y-3 rounded-lg border p-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`topic-title-${topic.id}`}>Topic title</Label>
          <Input
            id={`topic-title-${topic.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`topic-desc-${topic.id}`}>Description (optional)</Label>
          <Input
            id={`topic-desc-${topic.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit topic">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canMoveUp || pending}
        onClick={() => onMove('up')}
        aria-label="Move topic up"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canMoveDown || pending}
        onClick={() => onMove('down')}
        aria-label="Move topic down"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={confirming ? 'text-destructive' : ''}
        onClick={onDelete}
        disabled={pending}
      >
        {confirming ? (
          <>
            <X className="mr-1 h-4 w-4" /> Delete {topic.lessonCount > 0 ? `topic + ${topic.lessonCount} lesson${topic.lessonCount === 1 ? '' : 's'}` : 'topic'}?
          </>
        ) : (
          <>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </>
        )}
      </Button>
    </div>
  );
}
