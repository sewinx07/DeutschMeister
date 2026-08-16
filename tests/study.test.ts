import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/server/db';
import { MembershipStatus, Role } from '@/generated/prisma/enums';
import { getStudyState, syncStudyState, clearStudyState } from '@/lib/server/study';
import { emptySkills, DEFAULT_SETTINGS } from '@/lib/server/study';
import type { StudyState } from '@/types';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

function makeState(overrides: Partial<StudyState> = {}): StudyState {
  return {
    user: {
      id: 'u',
      name: 'Anna',
      email: 'anna@example.test',
      createdAt: '2026-01-01T00:00:00.000Z',
      currentLevel: 'A1',
      targetLevel: 'B1',
      examType: 'Goethe-Zertifikat',
      examDate: '2026-06-01T00:00:00.000Z',
      dailyStudyMinutes: 30,
      strengths: ['listening'],
      weaknesses: ['grammar'],
      targetAusbildung: 'Fachinformatiker',
      itField: 'Anwendungsentwicklung',
      preferredRegions: ['Berlin'],
      onboarded: true,
    },
    skills: { ...emptySkills(), vocabulary: { ...emptySkills().vocabulary, score: 60, lessonsCompleted: 4, practiceMinutes: 120 } },
    vocabulary: [
      {
        id: 'voc-bewerbung',
        german: 'Bewerbung',
        article: 'die',
        plural: '-en',
        english: 'application (job)',
        example: 'Meine Bewerbung ist fertig.',
        exampleEnglish: 'My application is ready.',
        category: 'Ausbildung / Work',
        difficulty: 2,
        familiarity: 0.7,
        ease: 2.7,
        interval: 5,
        reviews: 3,
        dueAt: '2026-01-20T00:00:00.000Z',
        lastReviewedAt: '2026-01-15T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        mastered: false,
      },
      {
        id: 'voc-beruf',
        german: 'Beruf',
        article: 'der',
        plural: '-e',
        english: 'profession',
        example: 'Welcher Beruf passt zu mir?',
        category: 'Ausbildung / Work',
        difficulty: 1,
        familiarity: 0.9,
        ease: 2.9,
        interval: 30,
        reviews: 6,
        dueAt: '2026-02-15T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        mastered: true,
      },
    ],
    plan: {
      id: 'plan-x',
      generatedAt: '2026-01-01T00:00:00.000Z',
      lastAdaptedAt: '2026-01-01T00:00:00.000Z',
      examDate: '2026-06-01',
      phases: [
        { id: 'p1', name: 'Foundation', start: '2026-01-01', end: '2026-02-01', focus: ['grammar', 'vocabulary'], color: 'indigo' },
      ],
      adjustments: [
        { id: 'a1', date: '2026-01-05T00:00:00.000Z', reason: 'weakest skill', skill: 'grammar', minutesAdded: 15 },
      ],
    },
    tasks: [
      {
        id: 'task-1',
        date: '2026-01-16',
        skill: 'grammar',
        title: 'Articles: der/die/das',
        durationMinutes: 30,
        difficulty: 2,
        status: 'done',
        type: 'grammar',
        phaseId: 'p1',
        completedAt: '2026-01-16T09:00:00.000Z',
      },
    ],
    studySessions: [
      {
        id: 'ses-1',
        taskId: 'task-1',
        skill: 'grammar',
        startedAt: '2026-01-16T08:30:00.000Z',
        endedAt: '2026-01-16T09:00:00.000Z',
        durationMinutes: 30,
        source: 'Articles',
        score: 80,
        completed: true,
      },
    ],
    mockResults: [
      {
        id: 'mock-1',
        templateId: 'tpl-1',
        name: 'Mock B1',
        level: 'B1',
        date: '2026-01-10T00:00:00.000Z',
        durationMinutes: 90,
        sectionScores: [{ sectionId: 's1', name: 'Lesen', score: 7, maxScore: 10 }],
        totalScore: 7,
        totalMaxScore: 10,
        percent: 70,
        answers: { q1: 'a' },
        mistakes: [],
        weakTopics: ['articles'],
      },
    ],
    mistakes: [
      {
        id: 'mis-1',
        category: 'articles',
        original: 'Ich habe die Termin.',
        correct: 'Ich habe den Termin.',
        reason: 'Maskuline Nomen: der → den (Akkusativ).',
        createdAt: '2026-01-10T00:00:00.000Z',
        reviewDate: '2026-01-17',
        reviewed: false,
        timesCorrect: 0,
      },
    ],
    achievements: [
      { id: 'ach-streak', key: 'streak-3', title: '3-day streak', description: 'Study 3 days in a row', icon: 'flame', unlockedAt: '2026-01-05T00:00:00.000Z', progress: 3, target: 3 },
    ],
    speakingSessions: [
      {
        id: 'spk-1',
        promptId: 'sp1',
        level: 'A1',
        date: '2026-01-12T00:00:00.000Z',
        answers: [{ question: 'Woher kommst du?', answer: 'Aus Italien.' }],
        feedback: { fluency: 3, vocabulary: 4, grammar: 3, pronunciation: 4, mistakes: [], strengths: [], recommendedPhrases: [] },
        durationMinutes: 15,
      },
    ],
    settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    ...overrides,
  };
}

describe.skipIf(!enabled)('study engine persistence', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgAId = '';
  let orgBId = '';
  let userAId = '';
  let userBId = '';

  beforeAll(async () => {
    if (!enabled) return;
    const orgA = await prisma.organization.create({ data: { name: `soa-${tag}`, slug: `soa-${tag}` } });
    const orgB = await prisma.organization.create({ data: { name: `sob-${tag}`, slug: `sob-${tag}` } });
    orgAId = orgA.id;
    orgBId = orgB.id;
    orgIds.push(orgAId, orgBId);
    const ua = await prisma.user.create({ data: { email: `ua-${tag}@test`, name: 'U A' } });
    const ub = await prisma.user.create({ data: { email: `ub-${tag}@test`, name: 'U B' } });
    userAId = ua.id;
    userBId = ub.id;
    userIds.push(userAId, userBId);
    await prisma.organizationMember.createMany({
      data: [
        { orgId: orgAId, userId: userAId, role: Role.INDIVIDUAL_LEARNER, status: MembershipStatus.ACTIVE },
        { orgId: orgBId, userId: userAId, role: Role.INDIVIDUAL_LEARNER, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: userBId, role: Role.INDIVIDUAL_LEARNER, status: MembershipStatus.ACTIVE },
      ],
    });
  });

  afterAll(async () => {
    if (!enabled) return;
    for (const orgId of orgIds) {
      const learners = await prisma.learnerProfile.findMany({ where: { orgId } });
      for (const l of learners) {
        await clearStudyState(orgId, l.userId);
      }
    }
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it('returns an empty state on first access and is idempotent', async () => {
    const first = await getStudyState(orgAId, userAId);
    expect(first.user?.onboarded).toBe(false);
    expect(first.vocabulary).toHaveLength(0);
    expect(Object.values(first.skills).every((s) => s.score === 0)).toBe(true);
    const second = await getStudyState(orgAId, userAId);
    expect(second.user?.id).toBe(userAId);
    const count = await prisma.learnerProfile.count({ where: { orgId: orgAId, userId: userAId } });
    expect(count).toBe(1);
  });

  it('round-trips a full study state through sync + get', async () => {
    const state = makeState();
    await syncStudyState(orgAId, userAId, state);
    const loaded = await getStudyState(orgAId, userAId);

    expect(loaded.user?.onboarded).toBe(true);
    expect(loaded.user?.currentLevel).toBe('A1');
    expect(loaded.user?.strengths).toEqual(['listening']);
    expect(loaded.skills.vocabulary.score).toBe(60);
    expect(loaded.vocabulary).toHaveLength(2);

    const bew = loaded.vocabulary.find((w) => w.german === 'Bewerbung')!;
    expect(bew.familiarity).toBeCloseTo(0.7);
    expect(bew.ease).toBeCloseTo(2.7);
    expect(bew.interval).toBe(5);
    expect(bew.dueAt).toBe('2026-01-20T00:00:00.000Z');

    expect(loaded.plan?.phases[0].name).toBe('Foundation');
    expect(loaded.plan?.adjustments[0].skill).toBe('grammar');
    expect(loaded.tasks[0].status).toBe('done');
    expect(loaded.studySessions[0].score).toBe(80);
    expect(loaded.mockResults[0].percent).toBe(70);
    expect(loaded.mockResults[0].sectionScores[0].maxScore).toBe(10);
    expect(loaded.mistakes[0].category).toBe('articles');
    expect(loaded.achievements[0].key).toBe('streak-3');
    expect(loaded.achievements[0].progress).toBe(3);
    expect(loaded.speakingSessions[0].feedback.fluency).toBe(3);
    expect(loaded.settings.theme).toBe('dark');
    expect(loaded.settings.sound).toBe(true);
  });

  it('syncs are idempotent and reflect removals/updates', async () => {
    const state = makeState();
    await syncStudyState(orgAId, userAId, state);

    const updated = makeState({
      vocabulary: state.vocabulary.filter((w) => w.german === 'Bewerbung'),
      tasks: state.tasks.map((t) => ({ ...t, status: 'in_progress' as const })),
    });
    await syncStudyState(orgAId, userAId, updated);

    const loaded = await getStudyState(orgAId, userAId);
    expect(loaded.vocabulary).toHaveLength(1);
    expect(loaded.tasks).toHaveLength(1);
    expect(loaded.tasks[0].status).toBe('in_progress');
    const rows = await prisma.studyTask.count({ where: { learner: { orgId: orgAId, userId: userAId } } });
    expect(rows).toBe(1);
  });

  it('isolation: state stays scoped to (org, user)', async () => {
    const state = makeState();
    await syncStudyState(orgAId, userAId, state);

    const otherUser = await getStudyState(orgAId, userBId);
    expect(otherUser.vocabulary).toHaveLength(0);
    expect(otherUser.user?.id).toBe(userBId);

    const otherOrg = await getStudyState(orgBId, userAId);
    expect(otherOrg.vocabulary).toHaveLength(0);
    expect(otherOrg.user?.id).toBe(userAId);
  });

  it('clearStudyState wipes everything for the learner', async () => {
    await syncStudyState(orgAId, userAId, makeState());
    await clearStudyState(orgAId, userAId);
    const loaded = await getStudyState(orgAId, userAId);
    expect(loaded.user?.onboarded).toBe(false);
    expect(loaded.vocabulary).toHaveLength(0);
    expect(loaded.tasks).toHaveLength(0);
    expect(loaded.mockResults).toHaveLength(0);
  });
});
