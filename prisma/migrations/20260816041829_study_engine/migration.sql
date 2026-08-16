-- CreateTable
CREATE TABLE "learner_profile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentLevel" TEXT NOT NULL,
    "targetLevel" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "examDate" TEXT,
    "dailyStudyMinutes" INTEGER NOT NULL DEFAULT 30,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "targetAusbildung" TEXT,
    "itField" TEXT,
    "preferredRegions" JSONB,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learner_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_entry" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "german" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "plural" TEXT,
    "english" TEXT NOT NULL,
    "ipa" TEXT,
    "example" TEXT NOT NULL,
    "exampleEnglish" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "familiarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_progress" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "previousScore" INTEGER NOT NULL DEFAULT 0,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "practiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plan" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "lastAdaptedAt" TIMESTAMP(3) NOT NULL,
    "examDate" TEXT NOT NULL,
    "phases" JSONB NOT NULL,
    "adjustments" JSONB NOT NULL,

    CONSTRAINT "study_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_task" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT,
    "phaseId" TEXT,
    "completedAt" TEXT,
    "isRest" BOOLEAN NOT NULL DEFAULT false,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "study_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_session" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "taskId" TEXT,
    "skill" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL,
    "source" TEXT,
    "score" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "study_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exam_result" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "sectionScores" JSONB NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "totalMaxScore" INTEGER NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "answers" JSONB NOT NULL,
    "mistakes" JSONB NOT NULL,
    "weakTopics" JSONB NOT NULL,

    CONSTRAINT "mock_exam_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistake" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "original" TEXT NOT NULL,
    "correct" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "relatedTopic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "reviewDate" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "unlockedAt" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speaking_session" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "answers" JSONB NOT NULL,
    "feedback" JSONB NOT NULL,
    "durationMinutes" INTEGER NOT NULL,

    CONSTRAINT "speaking_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_settings" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "sound" BOOLEAN NOT NULL DEFAULT true,
    "examMode" BOOLEAN NOT NULL DEFAULT false,
    "restDayEvery" INTEGER NOT NULL DEFAULT 7,
    "notifications" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "learner_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learner_profile_userId_idx" ON "learner_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "learner_profile_orgId_userId_key" ON "learner_profile"("orgId", "userId");

-- CreateIndex
CREATE INDEX "vocabulary_entry_learnerId_dueAt_idx" ON "vocabulary_entry"("learnerId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_entry_learnerId_german_key" ON "vocabulary_entry"("learnerId", "german");

-- CreateIndex
CREATE UNIQUE INDEX "skill_progress_learnerId_skill_key" ON "skill_progress"("learnerId", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "study_plan_learnerId_key" ON "study_plan"("learnerId");

-- CreateIndex
CREATE INDEX "study_task_learnerId_date_idx" ON "study_task"("learnerId", "date");

-- CreateIndex
CREATE INDEX "study_session_learnerId_idx" ON "study_session"("learnerId");

-- CreateIndex
CREATE INDEX "mock_exam_result_learnerId_idx" ON "mock_exam_result"("learnerId");

-- CreateIndex
CREATE INDEX "mistake_learnerId_idx" ON "mistake"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_learnerId_key_key" ON "achievement"("learnerId", "key");

-- CreateIndex
CREATE INDEX "speaking_session_learnerId_idx" ON "speaking_session"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "learner_settings_learnerId_key" ON "learner_settings"("learnerId");

-- AddForeignKey
ALTER TABLE "learner_profile" ADD CONSTRAINT "learner_profile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_profile" ADD CONSTRAINT "learner_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_entry" ADD CONSTRAINT "vocabulary_entry_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plan" ADD CONSTRAINT "study_plan_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_task" ADD CONSTRAINT "study_task_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session" ADD CONSTRAINT "study_session_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_result" ADD CONSTRAINT "mock_exam_result_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistake" ADD CONSTRAINT "mistake_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement" ADD CONSTRAINT "achievement_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_session" ADD CONSTRAINT "speaking_session_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_settings" ADD CONSTRAINT "learner_settings_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
