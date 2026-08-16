-- CreateTable
CREATE TABLE "activity_event" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "classId" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "studentId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_event_orgId_createdAt_idx" ON "activity_event"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_event_classId_idx" ON "activity_event"("classId");

-- CreateIndex
CREATE INDEX "notification_recipientId_readAt_createdAt_idx" ON "notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notification_orgId_createdAt_idx" ON "notification"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "activity_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
