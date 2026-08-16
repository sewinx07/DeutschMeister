'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/store/app-store';
import { LessonPlayer } from '@/components/lessons/lesson-player';

export default function LessonPage() {
  const params = useParams<{ taskId: string }>();
  const { db } = useApp();
  const task = db?.tasks.find((t) => t.id === params.taskId);

  if (!db) return null;

  if (!task) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Task not found</CardTitle>
            <CardDescription>The lesson may have been removed or already completed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/plan">Back to plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <LessonPlayer task={task} />;
}
