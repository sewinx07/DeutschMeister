import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/server/db';

export type ActivityEventType =
  | 'assignment.created'
  | 'assignment.deleted'
  | 'assignment.completed'
  | 'student.enrolled'
  | 'student.unenrolled'
  | 'class.created'
  | 'course.created'
  | 'course.published'
  | 'course.unpublished'
  | 'course.topic.created'
  | 'course.topic.updated'
  | 'course.topic.deleted'
  | 'course.lesson.created'
  | 'course.lesson.updated'
  | 'course.lesson.deleted'
  | 'member.invited'
  | 'member.joined'
  | 'member.removed';

export type RecordActivityInput = {
  orgId: string;
  actorId?: string | null;
  type: ActivityEventType;
  classId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  studentId?: string | null;
  /** Verb phrase shown after the actor's name, e.g. "assigned “Lesson A” to Gruppe 1". */
  summary: string;
  notify?: {
    recipientIds: string[];
    title: string;
    body?: string;
    link?: string;
  } | null;
};

/**
 * Appends an event to the org activity feed and, optionally, personal
 * notifications for its recipients. Best-effort — never breaks the caller.
 */
export async function recordActivity(input: RecordActivityInput) {
  try {
    await prisma.$transaction(async (tx) => {
      const event = await tx.activityEvent.create({
        data: {
          orgId: input.orgId,
          actorId: input.actorId ?? null,
          type: input.type,
          classId: input.classId ?? null,
          courseId: input.courseId ?? null,
          lessonId: input.lessonId ?? null,
          studentId: input.studentId ?? null,
          summary: input.summary,
        },
      });

      const recipients = input.notify?.recipientIds ?? [];
      if (recipients.length > 0) {
        await tx.notification.createMany({
          data: recipients.map((recipientId) => ({
            orgId: input.orgId,
            recipientId,
            actorId: input.actorId ?? null,
            eventId: event.id,
            type: input.type,
            title: input.notify!.title,
            body: input.notify!.body ?? null,
            link: input.notify!.link ?? null,
          })),
        });
      }
    });
  } catch {
    // activity logging is best-effort
  }
}

function timeAgoLabel(d: Date): string {
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export type ActivityFeedItem = {
  id: string;
  type: string;
  summary: string;
  actorName: string | null;
  className: string | null;
  courseTitle: string | null;
  lessonTitle: string | null;
  classId: string | null;
  courseId: string | null;
  createdAt: Date;
  timeAgo: string;
};

const STUDENT_READABLE_CLASS_TYPES = ['assignment.created', 'assignment.deleted'] as const;

type ActivityEventRow = Prisma.ActivityEventGetPayload<{
  include: {
    actor: { select: { name: true } };
    class: { select: { name: true } };
    course: { select: { title: true } };
    lesson: { select: { title: true } };
  };
}>;

/**
 * Org-wide activity feed, newest first. Staff (anyone with student-data
 * access) see every event. Learners only see org-wide events, events about
 * themselves, and assignment events for classes they are enrolled in — never
 * classmates' completions or roster changes.
 */
export async function loadActivityFeed(
  orgId: string,
  viewerId: string,
  isStaff: boolean,
  limit = 50,
): Promise<ActivityFeedItem[]> {
  const rows: ActivityEventRow[] = await prisma.activityEvent.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: { select: { name: true } },
      class: { select: { name: true } },
      course: { select: { title: true } },
      lesson: { select: { title: true } },
    },
  });

  const visible = isStaff ? rows : await filterForLearner(rows, orgId, viewerId);

  return visible.map((row) => ({
    id: row.id,
    type: row.type,
    summary: row.summary,
    actorName: row.actor?.name ?? null,
    className: row.class?.name ?? null,
    courseTitle: row.course?.title ?? null,
    lessonTitle: row.lesson?.title ?? null,
    classId: row.classId,
    courseId: row.courseId,
    createdAt: row.createdAt,
    timeAgo: timeAgoLabel(row.createdAt),
  }));
}

async function filterForLearner(rows: ActivityEventRow[], orgId: string, viewerId: string) {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: viewerId, class: { orgId } },
    select: { classId: true },
  });
  const classIds = new Set(enrollments.map((e) => e.classId));
  return rows.filter((row) => {
    if (!row.classId || row.type === 'class.created') return true;
    if (row.studentId === viewerId) return true;
    if (!classIds.has(row.classId)) return false;
    return (STUDENT_READABLE_CLASS_TYPES as readonly string[]).includes(row.type);
  });
}

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  actorName: string | null;
  readAt: Date | null;
  createdAt: Date;
  timeAgo: string;
};

export async function loadNotifications(orgId: string, recipientId: string, limit = 50) {
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { orgId, recipientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: { name: true } } },
    }),
    prisma.notification.count({ where: { orgId, recipientId, readAt: null } }),
  ]);

  return {
    unread,
    items: rows.map((row): NotificationItem => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      actorName: row.actor?.name ?? null,
      readAt: row.readAt,
      createdAt: row.createdAt,
      timeAgo: timeAgoLabel(row.createdAt),
    })),
  };
}

export async function loadUnreadCount(orgId: string, recipientId: string): Promise<number> {
  return prisma.notification.count({ where: { orgId, recipientId, readAt: null } });
}
