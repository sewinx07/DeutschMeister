import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/server/db';
import type {
  Achievement,
  AppSettings,
  CefrLevel,
  Difficulty,
  ExamType,
  Mistake,
  MockExamResult,
  SkillKey,
  SkillState,
  SpeakingSession,
  StudyPlan,
  StudySession,
  StudyState,
  StudySummary,
  StudyTask,
  UserProfile,
  VocabularyWord,
} from '@/types';

export const SKILL_KEYS: SkillKey[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];

/** Local-date day key (`YYYY-MM-DD`) — mirrors the catalog's day handling. */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole days from `a` to `b` (day boundaries in local time). */
function daysBetween(a: Date, b: Date): number {
  const dayMs = 86400000;
  const aStart = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bStart = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bStart - aStart) / dayMs);
}

/** Interactive transaction timeout — first-login imports rewrite many rows. */
const SYNC_TIMEOUT_MS = 120_000;

export function emptySkillState(skill: SkillKey): SkillState {
  return { skill, score: 0, previousScore: 0, lessonsCompleted: 0, practiceMinutes: 0 };
}

export function emptySkills(): Record<SkillKey, SkillState> {
  const record = {} as Record<SkillKey, SkillState>;
  for (const s of SKILL_KEYS) record[s] = emptySkillState(s);
  return record;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  sound: true,
  examMode: false,
  restDayEvery: 7,
  notifications: true,
};

/** Resolve (creating when needed) the learner row for (org, user). */
async function getOrCreateLearner(orgId: string, userId: string) {
  const existing = await prisma.learnerProfile.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (existing) return existing;
  return prisma.learnerProfile.create({
    data: { orgId, userId, currentLevel: 'A1', targetLevel: 'B1', examType: 'Other' },
  });
}

type ProfileRow = {
  currentLevel: string;
  targetLevel: string;
  examType: string;
  examDate: string | null;
  dailyStudyMinutes: number;
  strengths: Prisma.JsonValue | null;
  weaknesses: Prisma.JsonValue | null;
  targetAusbildung: string | null;
  itField: string | null;
  preferredRegions: Prisma.JsonValue | null;
  onboarded: boolean;
  timezone: string | null;
  createdAt: Date;
};

function toUserProfile(row: ProfileRow, user: { id: string; name: string; email: string; createdAt: Date }): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: row.createdAt.toISOString(),
    currentLevel: row.currentLevel as CefrLevel,
    targetLevel: row.targetLevel as CefrLevel,
    examType: row.examType as ExamType,
    examDate: row.examDate ?? '',
    dailyStudyMinutes: row.dailyStudyMinutes,
    strengths: Array.isArray(row.strengths) ? (row.strengths as string[]) : [],
    weaknesses: Array.isArray(row.weaknesses) ? (row.weaknesses as string[]) : [],
    targetAusbildung: row.targetAusbildung ?? '',
    itField: row.itField ?? '',
    preferredRegions: Array.isArray(row.preferredRegions) ? (row.preferredRegions as string[]) : [],
    onboarded: row.onboarded,
    timezone: row.timezone ?? undefined,
  };
}

type VocabularyRow = {
  wordId: string;
  german: string;
  article: string;
  plural: string | null;
  english: string;
  ipa: string | null;
  example: string;
  exampleEnglish: string | null;
  category: string;
  difficulty: number;
  familiarity: number;
  ease: number;
  interval: number;
  reviews: number;
  dueAt: Date;
  lastReviewedAt: Date | null;
  createdAt: Date;
  mastered: boolean;
};

function toVocabularyWord(row: VocabularyRow): VocabularyWord {
  return {
    id: row.wordId,
    german: row.german,
    article: row.article,
    plural: row.plural ?? undefined,
    english: row.english,
    ipa: row.ipa ?? undefined,
    example: row.example,
    exampleEnglish: row.exampleEnglish ?? undefined,
    category: row.category,
    difficulty: row.difficulty as Difficulty,
    familiarity: row.familiarity,
    ease: row.ease,
    interval: row.interval,
    reviews: row.reviews,
    dueAt: row.dueAt.toISOString(),
    lastReviewedAt: row.lastReviewedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    mastered: row.mastered,
  };
}

type SkillRow = {
  skill: string;
  score: number;
  previousScore: number;
  lessonsCompleted: number;
  practiceMinutes: number;
  lastPracticedAt: Date | null;
};

function toSkillState(row: SkillRow): SkillState {
  return {
    skill: row.skill as SkillKey,
    score: row.score,
    previousScore: row.previousScore,
    lessonsCompleted: row.lessonsCompleted,
    practiceMinutes: row.practiceMinutes,
    lastPracticedAt: row.lastPracticedAt?.toISOString(),
  };
}

type TaskRow = {
  id: string;
  date: string;
  skill: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  difficulty: number;
  status: string;
  type: string;
  sourceId: string | null;
  phaseId: string | null;
  completedAt: string | null;
  isRest: boolean;
  isPlaceholder: boolean;
};

function toTask(row: TaskRow): StudyTask {
  return {
    id: row.id,
    date: row.date,
    skill: row.skill as SkillKey,
    title: row.title,
    description: row.description ?? undefined,
    durationMinutes: row.durationMinutes,
    difficulty: row.difficulty as Difficulty,
    status: row.status as StudyTask['status'],
    type: row.type as StudyTask['type'],
    sourceId: row.sourceId ?? undefined,
    phaseId: row.phaseId ?? undefined,
    completedAt: row.completedAt ?? undefined,
    isRest: row.isRest,
    isPlaceholder: row.isPlaceholder,
  };
}

type SessionRow = {
  id: string;
  taskId: string | null;
  skill: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number;
  source: string | null;
  score: number | null;
  completed: boolean;
};

function toSession(row: SessionRow): StudySession {
  return {
    id: row.id,
    taskId: row.taskId ?? undefined,
    skill: row.skill as SkillKey,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString(),
    durationMinutes: row.durationMinutes,
    source: row.source ?? undefined,
    score: row.score ?? undefined,
    completed: row.completed,
  };
}

type MockRow = {
  id: string;
  templateId: string;
  name: string;
  level: string;
  date: Date;
  durationMinutes: number;
  sectionScores: Prisma.JsonValue;
  totalScore: number;
  totalMaxScore: number;
  percent: number;
  answers: Prisma.JsonValue;
  mistakes: Prisma.JsonValue;
  weakTopics: Prisma.JsonValue;
};

function toMockResult(row: MockRow): MockExamResult {
  return {
    id: row.id,
    templateId: row.templateId,
    name: row.name,
    level: row.level as CefrLevel,
    date: row.date.toISOString(),
    durationMinutes: row.durationMinutes,
    sectionScores: (row.sectionScores as unknown as MockExamResult['sectionScores']) ?? [],
    totalScore: row.totalScore,
    totalMaxScore: row.totalMaxScore,
    percent: row.percent,
    answers: (row.answers as unknown as MockExamResult['answers']) ?? {},
    mistakes: (row.mistakes as unknown as MockExamResult['mistakes']) ?? [],
    weakTopics: (row.weakTopics as unknown as MockExamResult['weakTopics']) ?? [],
  };
}

type MistakeRow = {
  id: string;
  category: string;
  subcategory: string | null;
  original: string;
  correct: string;
  reason: string;
  relatedTopic: string | null;
  createdAt: Date;
  reviewDate: string;
  reviewed: boolean;
  timesCorrect: number;
};

function toMistake(row: MistakeRow): Mistake {
  return {
    id: row.id,
    category: row.category as Mistake['category'],
    subcategory: row.subcategory ?? undefined,
    original: row.original,
    correct: row.correct,
    reason: row.reason,
    relatedTopic: row.relatedTopic ?? undefined,
    createdAt: row.createdAt.toISOString(),
    reviewDate: row.reviewDate,
    reviewed: row.reviewed,
    timesCorrect: row.timesCorrect,
  };
}

type AchievementRow = {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
};

function toAchievement(row: AchievementRow): Achievement {
  return {
    id: `ach-${row.key}`,
    key: row.key,
    title: row.title,
    description: row.description,
    icon: row.icon,
    unlockedAt: row.unlockedAt ?? undefined,
    progress: row.progress,
    target: row.target,
  };
}

type SpeakingRow = {
  id: string;
  promptId: string;
  level: string;
  date: Date;
  answers: Prisma.JsonValue;
  feedback: Prisma.JsonValue;
  durationMinutes: number;
};

function toSpeakingSession(row: SpeakingRow): SpeakingSession {
  return {
    id: row.id,
    promptId: row.promptId,
    level: row.level as CefrLevel,
    date: row.date.toISOString(),
    answers: (row.answers as unknown as SpeakingSession['answers']) ?? [],
    feedback: (row.feedback as unknown as SpeakingSession['feedback']) ?? {
      fluency: 0,
      vocabulary: 0,
      grammar: 0,
      pronunciation: 0,
      mistakes: [],
      strengths: [],
      recommendedPhrases: [],
    },
    durationMinutes: row.durationMinutes,
  };
}

/** Canonical comparison — skips DB writes when an incoming row is unchanged. */
function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Load the learner's full study state for (org, user). Returns an empty state
 * on first access (profile row created lazily).
 */
export async function getStudyState(orgId: string, userId: string): Promise<StudyState> {
  const learner = await getOrCreateLearner(orgId, userId);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const [vocabulary, skills, plan, tasks, sessions, mockResults, mistakes, achievements, speakingSessions, settings] =
    await Promise.all([
      prisma.vocabularyEntry.findMany({ where: { learnerId: learner.id } }),
      prisma.skillProgress.findMany({ where: { learnerId: learner.id } }),
      prisma.studyPlan.findUnique({ where: { learnerId: learner.id } }),
      prisma.studyTask.findMany({ where: { learnerId: learner.id }, orderBy: { date: 'asc' } }),
      prisma.studySessionRow.findMany({ where: { learnerId: learner.id } }),
      prisma.mockExamResultRow.findMany({ where: { learnerId: learner.id } }),
      prisma.mistakeRow.findMany({ where: { learnerId: learner.id } }),
      prisma.achievementRow.findMany({ where: { learnerId: learner.id } }),
      prisma.speakingSessionRow.findMany({ where: { learnerId: learner.id } }),
      prisma.learnerSettings.findUnique({ where: { learnerId: learner.id } }),
    ]);

  const skillRecord = emptySkills();
  for (const s of skills) {
    if (s.skill in skillRecord) skillRecord[s.skill as SkillKey] = toSkillState(s);
  }

  const planDto: StudyPlan | null = plan
    ? {
        id: `plan-${learner.id}`,
        generatedAt: plan.generatedAt.toISOString(),
        lastAdaptedAt: plan.lastAdaptedAt.toISOString(),
        examDate: plan.examDate,
        phases: (plan.phases as unknown as StudyPlan['phases']) ?? [],
        adjustments: (plan.adjustments as unknown as StudyPlan['adjustments']) ?? [],
      }
    : null;

  return {
    user: toUserProfile(learner, user),
    skills: skillRecord,
    vocabulary: vocabulary.map(toVocabularyWord),
    plan: planDto,
    tasks: tasks.map(toTask),
    studySessions: sessions.map(toSession),
    mockResults: mockResults.map(toMockResult),
    mistakes: mistakes.map(toMistake),
    achievements: achievements.map(toAchievement),
    speakingSessions: speakingSessions.map(toSpeakingSession),
    settings: settings
      ? {
          theme: (settings.theme as AppSettings['theme']) ?? 'system',
          sound: settings.sound,
          examMode: settings.examMode,
          restDayEvery: settings.restDayEvery,
          notifications: settings.notifications,
        }
      : { ...DEFAULT_SETTINGS },
  };
}

/** Persist the client's full study slice for (org, user), skipping unchanged rows. */
export async function syncStudyState(orgId: string, userId: string, state: StudyState): Promise<void> {
  const learner = await getOrCreateLearner(orgId, userId);

  await prisma.$transaction(
    async (tx) => {
      if (state.user) {
        await tx.learnerProfile.update({
          where: { id: learner.id },
          data: {
            currentLevel: state.user.currentLevel,
            targetLevel: state.user.targetLevel,
            examType: state.user.examType,
            examDate: state.user.examDate || null,
            dailyStudyMinutes: state.user.dailyStudyMinutes,
            strengths: (state.user.strengths ?? []) as Prisma.InputJsonValue,
            weaknesses: (state.user.weaknesses ?? []) as Prisma.InputJsonValue,
            targetAusbildung: state.user.targetAusbildung || null,
            itField: state.user.itField || null,
            preferredRegions: (state.user.preferredRegions ?? []) as Prisma.InputJsonValue,
            onboarded: state.user.onboarded,
            timezone: state.user.timezone ?? null,
          },
        });
      }

      await tx.learnerSettings.upsert({
        where: { learnerId: learner.id },
        update: {
          theme: state.settings.theme,
          sound: state.settings.sound,
          examMode: state.settings.examMode,
          restDayEvery: state.settings.restDayEvery,
          notifications: state.settings.notifications,
        },
        create: {
          learnerId: learner.id,
          theme: state.settings.theme,
          sound: state.settings.sound,
          examMode: state.settings.examMode,
          restDayEvery: state.settings.restDayEvery,
          notifications: state.settings.notifications,
        },
      });

      const incomingSkills = Object.values(state.skills);
      const existingSkills = await tx.skillProgress.findMany({ where: { learnerId: learner.id } });
      const skillByKey = new Map(existingSkills.map((s) => [s.skill, s]));
      await tx.skillProgress.deleteMany({
        where: { learnerId: learner.id, skill: { notIn: incomingSkills.map((s) => s.skill) } },
      });
      for (const s of incomingSkills) {
        const existing = skillByKey.get(s.skill);
        if (existing && same(toSkillState(existing), s)) continue;
        await tx.skillProgress.upsert({
          where: { learnerId_skill: { learnerId: learner.id, skill: s.skill } },
          update: {
            score: s.score,
            previousScore: s.previousScore,
            lessonsCompleted: s.lessonsCompleted,
            practiceMinutes: s.practiceMinutes,
            lastPracticedAt: s.lastPracticedAt ? new Date(s.lastPracticedAt) : null,
          },
          create: {
            learnerId: learner.id,
            skill: s.skill,
            score: s.score,
            previousScore: s.previousScore,
            lessonsCompleted: s.lessonsCompleted,
            practiceMinutes: s.practiceMinutes,
            lastPracticedAt: s.lastPracticedAt ? new Date(s.lastPracticedAt) : null,
          },
        });
      }

      const existingVocab = await tx.vocabularyEntry.findMany({ where: { learnerId: learner.id } });
      const vocabByGerman = new Map(existingVocab.map((w) => [w.german, w]));
      await tx.vocabularyEntry.deleteMany({
        where: { learnerId: learner.id, german: { notIn: state.vocabulary.map((w) => w.german) } },
      });
      for (const w of state.vocabulary) {
        const existing = vocabByGerman.get(w.german);
        if (existing && same(toVocabularyWord(existing), w)) continue;
        await tx.vocabularyEntry.upsert({
          where: { learnerId_german: { learnerId: learner.id, german: w.german } },
          update: {
            wordId: w.id,
            article: w.article,
            plural: w.plural ?? null,
            english: w.english,
            ipa: w.ipa ?? null,
            example: w.example,
            exampleEnglish: w.exampleEnglish ?? null,
            category: w.category,
            difficulty: w.difficulty,
            familiarity: w.familiarity,
            ease: w.ease,
            interval: w.interval,
            reviews: w.reviews,
            dueAt: new Date(w.dueAt),
            lastReviewedAt: w.lastReviewedAt ? new Date(w.lastReviewedAt) : null,
            createdAt: new Date(w.createdAt),
            mastered: w.mastered,
          },
          create: {
            learnerId: learner.id,
            wordId: w.id,
            german: w.german,
            article: w.article,
            plural: w.plural ?? null,
            english: w.english,
            ipa: w.ipa ?? null,
            example: w.example,
            exampleEnglish: w.exampleEnglish ?? null,
            category: w.category,
            difficulty: w.difficulty,
            familiarity: w.familiarity,
            ease: w.ease,
            interval: w.interval,
            reviews: w.reviews,
            dueAt: new Date(w.dueAt),
            lastReviewedAt: w.lastReviewedAt ? new Date(w.lastReviewedAt) : null,
            createdAt: new Date(w.createdAt),
            mastered: w.mastered,
          },
        });
      }

      if (state.plan) {
        await tx.studyPlan.upsert({
          where: { learnerId: learner.id },
          update: {
            generatedAt: new Date(state.plan.generatedAt),
            lastAdaptedAt: new Date(state.plan.lastAdaptedAt),
            examDate: state.plan.examDate,
            phases: state.plan.phases as unknown as Prisma.InputJsonValue,
            adjustments: state.plan.adjustments as unknown as Prisma.InputJsonValue,
          },
          create: {
            learnerId: learner.id,
            generatedAt: new Date(state.plan.generatedAt),
            lastAdaptedAt: new Date(state.plan.lastAdaptedAt),
            examDate: state.plan.examDate,
            phases: state.plan.phases as unknown as Prisma.InputJsonValue,
            adjustments: state.plan.adjustments as unknown as Prisma.InputJsonValue,
          },
        });
      }

      const incomingTasks = state.tasks;
      const existingTasks = await tx.studyTask.findMany({ where: { learnerId: learner.id } });
      const taskById = new Map(existingTasks.map((t) => [t.id, t]));
      await tx.studyTask.deleteMany({
        where: { learnerId: learner.id, id: { notIn: incomingTasks.map((t) => t.id) } },
      });
      for (const t of incomingTasks) {
        const existing = taskById.get(t.id);
        if (existing && same(toTask(existing), t)) continue;
        await tx.studyTask.upsert({
          where: { id: t.id },
          update: {
            learnerId: learner.id,
            date: t.date,
            skill: t.skill,
            title: t.title,
            description: t.description ?? null,
            durationMinutes: t.durationMinutes,
            difficulty: t.difficulty,
            status: t.status,
            type: t.type,
            sourceId: t.sourceId ?? null,
            phaseId: t.phaseId ?? null,
            completedAt: t.completedAt ?? null,
            isRest: t.isRest ?? false,
            isPlaceholder: t.isPlaceholder ?? false,
          },
          create: {
            id: t.id,
            learnerId: learner.id,
            date: t.date,
            skill: t.skill,
            title: t.title,
            description: t.description ?? null,
            durationMinutes: t.durationMinutes,
            difficulty: t.difficulty,
            status: t.status,
            type: t.type,
            sourceId: t.sourceId ?? null,
            phaseId: t.phaseId ?? null,
            completedAt: t.completedAt ?? null,
            isRest: t.isRest ?? false,
            isPlaceholder: t.isPlaceholder ?? false,
          },
        });
      }

      const incomingSessions = state.studySessions;
      const existingSessions = await tx.studySessionRow.findMany({ where: { learnerId: learner.id } });
      const sessionById = new Map(existingSessions.map((s) => [s.id, s]));
      await tx.studySessionRow.deleteMany({
        where: { learnerId: learner.id, id: { notIn: incomingSessions.map((s) => s.id) } },
      });
      for (const s of incomingSessions) {
        const existing = sessionById.get(s.id);
        if (existing && same(toSession(existing), s)) continue;
        await tx.studySessionRow.upsert({
          where: { id: s.id },
          update: {
            learnerId: learner.id,
            taskId: s.taskId ?? null,
            skill: s.skill,
            startedAt: new Date(s.startedAt),
            endedAt: s.endedAt ? new Date(s.endedAt) : null,
            durationMinutes: s.durationMinutes,
            source: s.source ?? null,
            score: s.score ?? null,
            completed: s.completed,
          },
          create: {
            id: s.id,
            learnerId: learner.id,
            taskId: s.taskId ?? null,
            skill: s.skill,
            startedAt: new Date(s.startedAt),
            endedAt: s.endedAt ? new Date(s.endedAt) : null,
            durationMinutes: s.durationMinutes,
            source: s.source ?? null,
            score: s.score ?? null,
            completed: s.completed,
          },
        });
      }

      const incomingMocks = state.mockResults;
      const existingMocks = await tx.mockExamResultRow.findMany({ where: { learnerId: learner.id } });
      const mockById = new Map(existingMocks.map((r) => [r.id, r]));
      await tx.mockExamResultRow.deleteMany({
        where: { learnerId: learner.id, id: { notIn: incomingMocks.map((r) => r.id) } },
      });
      for (const r of incomingMocks) {
        const existing = mockById.get(r.id);
        if (existing && same(toMockResult(existing), r)) continue;
        await tx.mockExamResultRow.upsert({
          where: { id: r.id },
          update: {
            learnerId: learner.id,
            templateId: r.templateId,
            name: r.name,
            level: r.level,
            date: new Date(r.date),
            durationMinutes: r.durationMinutes,
            sectionScores: r.sectionScores as unknown as Prisma.InputJsonValue,
            totalScore: r.totalScore,
            totalMaxScore: r.totalMaxScore,
            percent: r.percent,
            answers: r.answers as Prisma.InputJsonValue,
            mistakes: r.mistakes as unknown as Prisma.InputJsonValue,
            weakTopics: r.weakTopics as Prisma.InputJsonValue,
          },
          create: {
            id: r.id,
            learnerId: learner.id,
            templateId: r.templateId,
            name: r.name,
            level: r.level,
            date: new Date(r.date),
            durationMinutes: r.durationMinutes,
            sectionScores: r.sectionScores as unknown as Prisma.InputJsonValue,
            totalScore: r.totalScore,
            totalMaxScore: r.totalMaxScore,
            percent: r.percent,
            answers: r.answers as Prisma.InputJsonValue,
            mistakes: r.mistakes as unknown as Prisma.InputJsonValue,
            weakTopics: r.weakTopics as Prisma.InputJsonValue,
          },
        });
      }

      const incomingMistakes = state.mistakes;
      const existingMistakes = await tx.mistakeRow.findMany({ where: { learnerId: learner.id } });
      const mistakeById = new Map(existingMistakes.map((m) => [m.id, m]));
      await tx.mistakeRow.deleteMany({
        where: { learnerId: learner.id, id: { notIn: incomingMistakes.map((m) => m.id) } },
      });
      for (const m of incomingMistakes) {
        const existing = mistakeById.get(m.id);
        if (existing && same(toMistake(existing), m)) continue;
        await tx.mistakeRow.upsert({
          where: { id: m.id },
          update: {
            learnerId: learner.id,
            category: m.category,
            subcategory: m.subcategory ?? null,
            original: m.original,
            correct: m.correct,
            reason: m.reason,
            relatedTopic: m.relatedTopic ?? null,
            createdAt: new Date(m.createdAt),
            reviewDate: m.reviewDate,
            reviewed: m.reviewed,
            timesCorrect: m.timesCorrect,
          },
          create: {
            id: m.id,
            learnerId: learner.id,
            category: m.category,
            subcategory: m.subcategory ?? null,
            original: m.original,
            correct: m.correct,
            reason: m.reason,
            relatedTopic: m.relatedTopic ?? null,
            createdAt: new Date(m.createdAt),
            reviewDate: m.reviewDate,
            reviewed: m.reviewed,
            timesCorrect: m.timesCorrect,
          },
        });
      }

      const incomingAchievements = state.achievements;
      const existingAchievements = await tx.achievementRow.findMany({ where: { learnerId: learner.id } });
      const achievementByKey = new Map(existingAchievements.map((a) => [a.key, a]));
      await tx.achievementRow.deleteMany({
        where: { learnerId: learner.id, key: { notIn: incomingAchievements.map((a) => a.key) } },
      });
      for (const a of incomingAchievements) {
        const existing = achievementByKey.get(a.key);
        if (existing && same(toAchievement(existing), a)) continue;
        await tx.achievementRow.upsert({
          where: { learnerId_key: { learnerId: learner.id, key: a.key } },
          update: {
            title: a.title,
            description: a.description,
            icon: a.icon,
            unlockedAt: a.unlockedAt ?? null,
            progress: a.progress,
            target: a.target,
          },
          create: {
            learnerId: learner.id,
            key: a.key,
            title: a.title,
            description: a.description,
            icon: a.icon,
            unlockedAt: a.unlockedAt ?? null,
            progress: a.progress,
            target: a.target,
          },
        });
      }

      const incomingSpeaking = state.speakingSessions;
      const existingSpeaking = await tx.speakingSessionRow.findMany({ where: { learnerId: learner.id } });
      const speakingById = new Map(existingSpeaking.map((s) => [s.id, s]));
      await tx.speakingSessionRow.deleteMany({
        where: { learnerId: learner.id, id: { notIn: incomingSpeaking.map((s) => s.id) } },
      });
      for (const s of incomingSpeaking) {
        const existing = speakingById.get(s.id);
        if (existing && same(toSpeakingSession(existing), s)) continue;
        await tx.speakingSessionRow.upsert({
          where: { id: s.id },
          update: {
            learnerId: learner.id,
            promptId: s.promptId,
            level: s.level,
            date: new Date(s.date),
            answers: s.answers as Prisma.InputJsonValue,
            feedback: s.feedback as unknown as Prisma.InputJsonValue,
            durationMinutes: s.durationMinutes,
          },
          create: {
            id: s.id,
            learnerId: learner.id,
            promptId: s.promptId,
            level: s.level,
            date: new Date(s.date),
            answers: s.answers as Prisma.InputJsonValue,
            feedback: s.feedback as unknown as Prisma.InputJsonValue,
            durationMinutes: s.durationMinutes,
          },
        });
      }
    },
    { timeout: SYNC_TIMEOUT_MS }
  );
}

/** Wipe all study state for (org, user). Used by "reset all". */
export async function clearStudyState(orgId: string, userId: string): Promise<void> {
  const learner = await prisma.learnerProfile.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!learner) return;
  await prisma.$transaction([
    prisma.vocabularyEntry.deleteMany({ where: { learnerId: learner.id } }),
    prisma.skillProgress.deleteMany({ where: { learnerId: learner.id } }),
    prisma.studyTask.deleteMany({ where: { learnerId: learner.id } }),
    prisma.studySessionRow.deleteMany({ where: { learnerId: learner.id } }),
    prisma.mockExamResultRow.deleteMany({ where: { learnerId: learner.id } }),
    prisma.mistakeRow.deleteMany({ where: { learnerId: learner.id } }),
    prisma.achievementRow.deleteMany({ where: { learnerId: learner.id } }),
    prisma.speakingSessionRow.deleteMany({ where: { learnerId: learner.id } }),
    prisma.studyPlan.deleteMany({ where: { learnerId: learner.id } }),
    prisma.learnerSettings.deleteMany({ where: { learnerId: learner.id } }),
    prisma.learnerProfile.delete({ where: { id: learner.id } }),
  ], { timeout: SYNC_TIMEOUT_MS });
}

/** Read-only today's plan tasks for (org, user). Empty when no learner profile. */
export async function loadTodayTasks(orgId: string, userId: string): Promise<StudyTask[]> {
  const learner = await prisma.learnerProfile.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!learner) return [];
  const rows = await prisma.studyTask.findMany({
    where: { learnerId: learner.id, date: localDayKey(new Date()) },
    orderBy: { id: 'asc' },
  });
  return rows.map(toTask);
}

/**
 * Read-only summary of a learner's study state for (org, user). Returns null
 * when the learner has no profile yet. Unlike `getStudyState` this never
 * creates rows, so it is safe to use in teacher-facing read paths.
 */
export async function getStudySummary(orgId: string, userId: string): Promise<StudySummary | null> {
  const learner = await prisma.learnerProfile.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!learner) return null;

  const [skills, tasks, sessions, vocabulary, mistakes, mocks, plan] = await Promise.all([
    prisma.skillProgress.findMany({ where: { learnerId: learner.id } }),
    prisma.studyTask.findMany({ where: { learnerId: learner.id } }),
    prisma.studySessionRow.findMany({ where: { learnerId: learner.id } }),
    prisma.vocabularyEntry.findMany({ where: { learnerId: learner.id } }),
    prisma.mistakeRow.findMany({ where: { learnerId: learner.id } }),
    prisma.mockExamResultRow.findMany({ where: { learnerId: learner.id } }),
    prisma.studyPlan.findUnique({ where: { learnerId: learner.id } }),
  ]);

  const skillRecord = emptySkills();
  for (const s of skills) {
    if (s.skill in skillRecord) skillRecord[s.skill as SkillKey] = toSkillState(s);
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const recent = sessions.filter((s) => s.startedAt >= weekAgo);

  const activity: number[] = [];
  for (const s of sessions) activity.push(s.startedAt.getTime());
  for (const t of tasks) if (t.completedAt) activity.push(new Date(t.completedAt).getTime());
  for (const m of mocks) activity.push(m.date.getTime());
  const lastActiveAt = activity.length > 0 ? new Date(Math.max(...activity)).toISOString() : null;

  const openMistakes = mistakes.filter((m) => !m.reviewed);
  const recentMistakes = [...openMistakes]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map(toMistake);

  const dueNow = new Date();
  const dueCount = vocabulary.filter((w) => !w.mastered && w.dueAt <= dueNow).length;

  const percents = mocks.map((m) => m.percent);
  const mockAvgPercent = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
  const mockBestPercent = percents.length ? Math.max(...percents) : null;

  let currentPhase: string | null = null;
  if (plan) {
    const phases = plan.phases as unknown as StudyPlan['phases'];
    const today = localDayKey(new Date());
    currentPhase =
      phases.find((p) => today >= localDayKey(new Date(p.start)) && today <= localDayKey(new Date(p.end)))?.name ??
      null;
  }

  return {
    onboarded: learner.onboarded,
    skills: skillRecord,
    tasksTotal: tasks.length,
    tasksDone: tasks.filter((t) => t.status === 'done').length,
    studyMinutesTotal: sessions.reduce((a, s) => a + s.durationMinutes, 0),
    sessionsLast7d: recent.length,
    minutesLast7d: recent.reduce((a, s) => a + s.durationMinutes, 0),
    lastActiveAt,
    vocabularyTotal: vocabulary.length,
    vocabularyMastered: vocabulary.filter((w) => w.mastered).length,
    vocabularyDue: dueCount,
    mockExamsTaken: mocks.length,
    mockAvgPercent,
    mockBestPercent,
    openMistakes: openMistakes.length,
    recentMistakes,
    currentLevel: learner.currentLevel,
    targetLevel: learner.targetLevel,
    examDate: learner.examDate,
    daysUntilExam: learner.examDate ? daysBetween(new Date(), new Date(learner.examDate)) : null,
    currentPhase,
  };
}
