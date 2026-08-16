import Link from 'next/link';
import { BellOff, BellRing } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MarkAllReadButton } from '@/components/app/mark-all-read';
import { loadNotifications } from '@/lib/server/activity';
import { requireOrgContext } from '@/lib/server/org-context';

export const metadata = {
  title: 'Notifications',
};

export default async function NotificationsPage() {
  const ctx = await requireOrgContext();
  const { unread, items } = await loadNotifications(ctx.org.id, ctx.user.id);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unread === 0
              ? 'You are all caught up.'
              : `${unread} unread notification${unread === 1 ? '' : 's'}.`}
          </p>
        </div>
        <MarkAllReadButton disabled={unread === 0} />
      </header>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BellOff className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No notifications yet. You will be notified when new assignments are given to your classes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-2">
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 py-3 ${n.readAt ? 'opacity-70' : ''}`}
                >
                  {!n.readAt && (
                    <span className="mt-1.5 grid size-2 shrink-0 place-items-center">
                      <span className="size-2 rounded-full bg-primary" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {n.link ? (
                        <Link href={n.link} className="underline-offset-2 hover:underline">
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.actorName ? `${n.actorName} · ` : ''}
                      {n.timeAgo}
                    </p>
                  </div>
                  {!n.readAt && (
                    <BellRing className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
