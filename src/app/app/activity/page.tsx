import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  School,
  Trash2,
  UserMinus,
  UserPlus,
  Activity as ActivityIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { loadActivityFeed, type ActivityFeedItem } from '@/lib/server/activity';
import { requireOrgContext } from '@/lib/server/org-context';
import { canViewAnalytics } from '@/lib/server/rbac';

export const metadata = {
  title: 'Activity',
};

function eventIcon(type: string) {
  const className = 'h-4 w-4';
  if (type.startsWith('assignment.')) {
    if (type.endsWith('.created')) return <ClipboardList className={className} />;
    if (type.endsWith('.completed')) return <CheckCircle2 className={className} />;
    return <Trash2 className={className} />;
  }
  if (type.startsWith('student.')) {
    return type.endsWith('.unenrolled') ? <UserMinus className={className} /> : <UserPlus className={className} />;
  }
  if (type === 'class.created') return <School className={className} />;
  if (type.startsWith('course.')) return <BookOpen className={className} />;
  return <ActivityIcon className={className} />;
}

function EventRow({ event }: { event: ActivityFeedItem }) {
  return (
    <li className="flex items-start gap-3 border-b py-3 last:border-b-0">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        {eventIcon(event.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {event.actorName && <span className="font-medium">{event.actorName}</span>}
          {event.actorName ? ' ' : ''}
          {event.summary}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {event.classId && (
            <Link href={`/app/classes/${event.classId}`} className="underline-offset-2 hover:underline">
              {event.className}
            </Link>
          )}
          {event.courseTitle && (
            <>
              {event.classId ? ' · ' : ''}
              {event.courseId ? (
                <Link href={`/app/courses/${event.courseId}`} className="underline-offset-2 hover:underline">
                  {event.courseTitle}
                </Link>
              ) : (
                event.courseTitle
              )}
            </>
          )}
          {event.lessonTitle ? ` · ${event.lessonTitle}` : ''}
          {event.courseTitle || event.classId ? ' · ' : ''}
          {event.timeAgo}
        </p>
      </div>
    </li>
  );
}

export default async function ActivityPage() {
  const ctx = await requireOrgContext();
  const isStaff = canViewAnalytics(ctx.role);
  const events = await loadActivityFeed(ctx.org.id, ctx.user.id, isStaff);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">
          {isStaff
            ? 'Recent activity across the whole organization.'
            : 'Recent activity across your classes and courses.'}
        </p>
      </header>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No activity yet. When lessons are assigned, completed or courses change, it will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-2">
            <ul>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
