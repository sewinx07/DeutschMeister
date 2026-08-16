import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/server/db';
import { MembershipStatus, Role } from '@/generated/prisma/enums';
import { getStudySummary, syncStudyState, clearStudyState, emptySkills, DEFAULT_SETTINGS } from '@/lib/server/study';
import { loadClassProgress } from '@/lib/server/class-progress';
import { addDays, dayKey } from '@/lib/db/storage';
import type { StudyState } from '@/types';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

function makeState(): StudyState {
  return {
    user: {
      id: 'u',
      name: 'Mira',
      email: 'mira@example.test',
      createdAt: '2026-01-01T00:00:00.000Z',
      currentLevel: 'A1',
      targetLevel: 'B1',
      examType: 'Goethe-Zertifikat',
      examDate: dayKey(addDays(new Date(), 90)),
      dailyStudyMinutes: 30,
      strengths: [],
      weaknesses: [],
      targetAusbildung: 'Fachinformatiker',
      itField: 'Anwendungsentwicklung',
      preferredRegions: [],
      onboarded: true,
    },
    skills: { ...emptySkills(), grammar: { ...emptySkills().grammar, score: 70, lessonsCompleted: 5, practiceMinutes: 150 } },
    vocabulary: [
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
        dueAt: dayKey(addDays(new Date(), 30)),
        createdAt: '2026-01-01T00:00:00.000Z',
        mastered: true,
      },
      {
        id: 'voc-bewerbung',
        german: 'Bewerbung',
        article: 'die',
        plural: '-en',
        english: 'application',
        example: 'Meine Bewerbung ist fertig.',
        category: 'Ausbildung / Work',
        difficulty: 2,
        familiarity: 0.4,
        ease: 2.3,
        interval: 1,
        reviews: 1,
        dueAt: '2020-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        mastered: false,
      },
    ],
    plan: {
      id: 'plan-x',
      generatedAt: '2026-01-01T00:00:00.000Z',
      lastAdaptedAt: '2026-01-01T00:00:00.000Z',
      examDate: dayKey(addDays(new Date(), 90)),
      phases: [
        {
          id: 'p1',
          name: 'Active Phase',
          start: dayKey(addDays(new Date(), -1)),
          end: dayKey(addDays(new Date(), 1)),
          focus: ['grammar'],
          color: 'indigo',
        },
      ],
      adjustments: [],
    },
    tasks: [
      {
        id: 'task-1',
        date: dayKey(new Date()),
        skill: 'grammar',
        title: 'Articles: der/die/das',
        durationMinutes: 30,
        difficulty: 2,
        status: 'done',
        type: 'grammar',
        phaseId: 'p1',
        completedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'task-2',
        date: dayKey(new Date()),
        skill: 'listening',
        title: 'Hörverstehen: Termin',
        durationMinutes: 20,
        difficulty: 2,
        status: 'pending',
        type: 'listening',
        phaseId: 'p1',
      },
    ],
    studySessions: [
      {
        id: 'ses-1',
        taskId: 'task-1',
        skill: 'grammar',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        endedAt: new Date().toISOString(),
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
        date: new Date(Date.now() - 86400000).toISOString(),
        durationMinutes: 90,
        sectionScores: [],
        totalScore: 7,
        totalMaxScore: 10,
        percent: 70,
        answers: {},
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
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        reviewDate: dayKey(new Date()),
        reviewed: false,
        timesCorrect: 0,
      },
    ],
    achievements: [],
    speakingSessions: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

describe.skipIf(!enabled)('teacher class progress', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  const syncedUsers: string[] = [];
  const classIds: string[] = [];
  let orgAId = '';
  let orgBId = '';
  let userAId = '';
  let userBId = '';
  let userCId = '';

  beforeAll(async () => {
    if (!enabled) return;
    const orgA = await prisma.organization.create({ data: { name: `cpa-${tag}`, slug: `cpa-${tag}` } });
    const orgB = await prisma.organization.create({ data: { name: `cpb-${tag}`, slug: `cpb-${tag}` } });
    orgAId = orgA.id;
    orgBId = orgB.id;
    orgIds.push(orgAId, orgBId);
    const ua = await prisma.user.create({ data: { email: `ua-${tag}@test`, name: 'Mira A' } });
    const ub = await prisma.user.create({ data: { email: `ub-${tag}@test`, name: 'Noah B' } });
    const uc = await prisma.user.create({ data: { email: `uc-${tag}@test`, name: 'Lena C' } });
    userAId = ua.id;
    userBId = ub.id;
    userCId = uc.id;
    userIds.push(userAId, userBId, userCId);
    await prisma.organizationMember.createMany({
      data: [
        { orgId: orgAId, userId: userAId, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
        { orgId: orgAId, userId: userBId, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
        { orgId: orgBId, userId: userCId, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
      ],
    });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.classEnrollment.deleteMany({ where: { classId: { in: classIds } } });
    await prisma.class.deleteMany({ where: { id: { in: classIds } } });
    await prisma.course.deleteMany({ where: { orgId: { in: orgIds } } });
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

  it('returns null and creates no rows when the learner has no profile', async () => {
    const summary = await getStudySummary(orgAId, userBId);
    expect(summary).toBeNull();
    const count = await prisma.learnerProfile.count({ where: { orgId: orgAId, userId: userBId } });
    expect(count).toBe(0);
  });

  it('aggregates persisted study state into a read-only summary', async () => {
    await syncStudyState(orgAId, userAId, makeState());
    syncedUsers.push(userAId);

    const s = await getStudySummary(orgAId, userAId);
    expect(s).not.toBeNull();
    expect(s!.onboarded).toBe(true);
    expect(s!.currentLevel).toBe('A1');
    expect(s!.targetLevel).toBe('B1');
    expect(s!.daysUntilExam).not.toBeNull();
    expect(s!.daysUntilExam!).toBeGreaterThan(0);
    expect(s!.currentPhase).toBe('Active Phase');
    expect(s!.tasksTotal).toBe(2);
    expect(s!.tasksDone).toBe(1);
    expect(s!.studyMinutesTotal).toBe(30);
    expect(s!.sessionsLast7d).toBe(1);
    expect(s!.minutesLast7d).toBe(30);
    expect(s!.lastActiveAt).not.toBeNull();
    expect(s!.vocabularyTotal).toBe(2);
    expect(s!.vocabularyMastered).toBe(1);
    expect(s!.vocabularyDue).toBe(1);
    expect(s!.mockExamsTaken).toBe(1);
    expect(s!.mockAvgPercent).toBe(70);
    expect(s!.mockBestPercent).toBe(70);
    expect(s!.openMistakes).toBe(1);
    expect(s!.recentMistakes[0]?.original).toBe('Ich habe die Termin.');
    expect(s!.skills.grammar.score).toBe(70);
  });

  it('loadClassProgress is org-scoped and lists only enrolled students', async () => {
    const course = await prisma.course.create({
      data: { orgId: orgAId, title: `Class course ${tag}`, subject: 'german' },
    });
    const klassA = await prisma.class.create({
      data: { orgId: orgAId, courseId: course.id, name: `Group A ${tag}` },
    });
    classIds.push(klassA.id);
    await prisma.classEnrollment.createMany({
      data: [
        { classId: klassA.id, studentId: userAId },
        { classId: klassA.id, studentId: userBId },
      ],
    });

    const inOrgA = await loadClassProgress(orgAId, klassA.id);
    expect(inOrgA).not.toBeNull();
    expect(inOrgA!.className).toBe(`Group A ${tag}`);
    expect(inOrgA!.students.map((s) => s.student.id)).toEqual([userAId, userBId]);

    const byId = new Map(inOrgA!.students.map((s) => [s.student.id, s]));
    expect(byId.get(userAId)!.summary).not.toBeNull();
    expect(byId.get(userBId)!.summary).toBeNull();

    const foreign = await loadClassProgress(orgBId, klassA.id);
    expect(foreign).toBeNull();
    const missing = await loadClassProgress(orgAId, `no-such-${tag}`);
    expect(missing).toBeNull();
  });
});
