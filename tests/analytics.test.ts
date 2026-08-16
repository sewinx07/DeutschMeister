import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/server/db';
import { loadOrgAnalytics } from '@/lib/server/analytics';
import { MembershipStatus, Role } from '@/generated/prisma/enums';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

function daysAgo(days: number, minutes: number): Date {
  return new Date(Date.now() - days * 86400000 - minutes * 60000);
}

describe.skipIf(!enabled)('cross-class analytics loader', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgId = '';
  let otherOrgId = '';
  let c1 = '';
  let c2 = '';

  async function makeLearner(email: string, profile: Partial<{ currentLevel: string; targetLevel: string }>) {
    const user = await prisma.user.create({
      data: { email, name: email.split('@')[0].split('-')[0] },
    });
    userIds.push(user.id);
    await prisma.organizationMember.create({
      data: { orgId, userId: user.id, role: Role.STUDENT, status: MembershipStatus.ACTIVE },
    });
    const learner = await prisma.learnerProfile.create({
      data: {
        orgId,
        userId: user.id,
        currentLevel: profile.currentLevel ?? 'A2',
        targetLevel: profile.targetLevel ?? 'B1',
        examType: 'Other',
        onboarded: true,
      },
    });
    return { user, learner };
  }

  beforeAll(async () => {
    if (!enabled) return;

    const org = await prisma.organization.create({ data: { name: `ana-${tag}`, slug: `ana-${tag}` } });
    orgId = org.id;
    orgIds.push(orgId);
    const other = await prisma.organization.create({ data: { name: `ana-${tag}-x`, slug: `ana-${tag}-x` } });
    otherOrgId = other.id;
    orgIds.push(otherOrgId);

    const course = await prisma.course.create({
      data: { orgId, title: `Deutsch ${tag}`, subject: 'German', level: 'B1', published: true },
    });

    const teacher = await prisma.user.create({ data: { email: `anateach-${tag}@test`, name: 'Teo' } });
    userIds.push(teacher.id);
    await prisma.organizationMember.create({
      data: { orgId, userId: teacher.id, role: Role.TEACHER, status: MembershipStatus.ACTIVE },
    });

    const c1row = await prisma.class.create({
      data: { orgId, courseId: course.id, teacherId: teacher.id, name: 'Gruppe A' },
    });
    c1 = c1row.id;
    const c2row = await prisma.class.create({
      data: { orgId, courseId: course.id, teacherId: teacher.id, name: 'Gruppe B' },
    });
    c2 = c2row.id;

    // s1: strong — skills 80..60 (avg 76), 6/6 done, active today, 10/10 vocab mastered, mock 75.
    const s1 = await makeLearner(`anas1-${tag}@test`, {});
    await prisma.skillProgress.createMany({
      data: [
        { learnerId: s1.learner.id, skill: 'vocabulary', score: 80 },
        { learnerId: s1.learner.id, skill: 'grammar', score: 85 },
        { learnerId: s1.learner.id, skill: 'reading', score: 90 },
        { learnerId: s1.learner.id, skill: 'listening', score: 70 },
        { learnerId: s1.learner.id, skill: 'writing', score: 75 },
        { learnerId: s1.learner.id, skill: 'speaking', score: 60 },
      ],
    });
    await prisma.studyTask.createMany({
      data: Array.from({ length: 6 }, (_, i) => ({
        id: `anas1t${i}-${tag}`,
        learnerId: s1.learner.id,
        date: '2000-01-01',
        skill: 'grammar',
        title: `S1 task ${i}`,
        durationMinutes: 20,
        difficulty: 2,
        status: 'done',
        type: 'grammar',
      })),
    });
    await prisma.studySessionRow.create({
      data: {
        id: `anas1s-${tag}`,
        learnerId: s1.learner.id,
        skill: 'grammar',
        startedAt: daysAgo(0, 30),
        durationMinutes: 30,
      },
    });
    await prisma.vocabularyEntry.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `anas1v${i}-${tag}`,
        learnerId: s1.learner.id,
        wordId: `w${i}`,
        german: `Wort${i}`,
        article: 'das',
        english: `Word${i}`,
        example: `Das ist Wort${i}.`,
        category: 'general',
        mastered: true,
        dueAt: daysAgo(5, 0),
        createdAt: daysAgo(20, 0),
      })),
    });
    await prisma.mockExamResultRow.create({
      data: {
        id: `anas1m-${tag}`,
        learnerId: s1.learner.id,
        templateId: 'tpl',
        name: 'Mock',
        level: 'B1',
        date: daysAgo(2, 0),
        durationMinutes: 90,
        sectionScores: {},
        totalScore: 75,
        totalMaxScore: 100,
        percent: 75,
        answers: {},
        mistakes: {},
        weakTopics: {},
      },
    });
    await prisma.mistakeRow.create({
      data: {
        id: `anas1x-${tag}`,
        learnerId: s1.learner.id,
        category: 'spelling',
        original: 'schwimmt',
        correct: 'schwimmt',
        reason: 'none',
        reviewDate: '2000-01-01',
        createdAt: daysAgo(2, 0),
        reviewed: false,
      },
    });
    await prisma.classEnrollment.create({ data: { classId: c1, studentId: s1.user.id } });

    // s2: low skill — avg 38, 4/4 done, active today.
    const s2 = await makeLearner(`anas2-${tag}@test`, {});
    await prisma.skillProgress.createMany({
      data: [
        { learnerId: s2.learner.id, skill: 'vocabulary', score: 30 },
        { learnerId: s2.learner.id, skill: 'grammar', score: 40 },
        { learnerId: s2.learner.id, skill: 'reading', score: 45 },
      ],
    });
    await prisma.studyTask.createMany({
      data: Array.from({ length: 4 }, (_, i) => ({
        id: `anas2t${i}-${tag}`,
        learnerId: s2.learner.id,
        date: '2000-01-01',
        skill: 'grammar',
        title: `S2 task ${i}`,
        durationMinutes: 20,
        difficulty: 2,
        status: 'done',
        type: 'grammar',
      })),
    });
    await prisma.studySessionRow.create({
      data: {
        id: `anas2s-${tag}`,
        learnerId: s2.learner.id,
        skill: 'grammar',
        startedAt: daysAgo(0, 120),
        durationMinutes: 30,
      },
    });
    await prisma.classEnrollment.create({ data: { classId: c1, studentId: s2.user.id } });

    // s3: inactive — avg 60, 3/6 done, last activity 9 days ago.
    const s3 = await makeLearner(`anas3-${tag}@test`, {});
    await prisma.skillProgress.create({
      data: { learnerId: s3.learner.id, skill: 'grammar', score: 60 },
    });
    await prisma.studyTask.createMany({
      data: Array.from({ length: 6 }, (_, i) => ({
        id: `anas3t${i}-${tag}`,
        learnerId: s3.learner.id,
        date: '2000-01-01',
        skill: 'grammar',
        title: `S3 task ${i}`,
        durationMinutes: 20,
        difficulty: 2,
        status: i < 3 ? 'done' : 'pending',
        type: 'grammar',
      })),
    });
    await prisma.studySessionRow.create({
      data: {
        id: `anas3s-${tag}`,
        learnerId: s3.learner.id,
        skill: 'grammar',
        startedAt: daysAgo(9, 0),
        durationMinutes: 20,
      },
    });
    await prisma.classEnrollment.create({ data: { classId: c1, studentId: s3.user.id } });

    // s4: low completion — avg 70, 2/10 done, active today.
    const s4 = await makeLearner(`anas4-${tag}@test`, {});
    await prisma.skillProgress.create({
      data: { learnerId: s4.learner.id, skill: 'grammar', score: 70 },
    });
    await prisma.studyTask.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `anas4t${i}-${tag}`,
        learnerId: s4.learner.id,
        date: '2000-01-01',
        skill: 'grammar',
        title: `S4 task ${i}`,
        durationMinutes: 20,
        difficulty: 2,
        status: i < 2 ? 'done' : 'pending',
        type: 'grammar',
      })),
    });
    await prisma.studySessionRow.create({
      data: {
        id: `anas4s-${tag}`,
        learnerId: s4.learner.id,
        skill: 'grammar',
        startedAt: daysAgo(0, 60),
        durationMinutes: 30,
      },
    });
    await prisma.classEnrollment.create({ data: { classId: c2, studentId: s4.user.id } });

    // s5: no data at all — profile only.
    const s5 = await makeLearner(`anas5-${tag}@test`, {});
    await prisma.classEnrollment.create({ data: { classId: c2, studentId: s5.user.id } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.classEnrollment.deleteMany({ where: { class: { orgId: { in: orgIds } } } });
    await prisma.class.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.course.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.mistakeRow.deleteMany({ where: { learner: { orgId: { in: orgIds } } } });
    await prisma.mockExamResultRow.deleteMany({ where: { learner: { orgId: { in: orgIds } } } });
    await prisma.vocabularyEntry.deleteMany({ where: { learner: { orgId: { in: orgIds } } } });
    await prisma.studySessionRow.deleteMany({ where: { learner: { orgId: { in: orgIds } } } });
    await prisma.studyTask.deleteMany({ where: { learner: { orgId: { in: orgIds } } } });
    await prisma.skillProgress.deleteMany({ where: { learner: { orgId: { in: orgIds } } } });
    await prisma.learnerProfile.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it('aggregates per-class and org totals', async () => {
    const a = await loadOrgAnalytics(orgId);

    expect(a.classes).toHaveLength(2);

    const [gA, gB] = a.classes;
    expect(gA.className).toBe('Gruppe A');
    expect(gA.studentsCount).toBe(3);
    expect(gA.studentsWithData).toBe(3);
    expect(gA.avgSkill).toBe(58); // (77 + 38 + 60) / 3
    expect(gA.tasksDone).toBe(13);
    expect(gA.tasksTotal).toBe(16);
    expect(gA.minutesLast7d).toBe(60);
    expect(gA.vocabularyMastered).toBe(10);
    expect(gA.vocabularyTotal).toBe(10);
    expect(gA.mockAvgPercent).toBe(75);
    expect(gA.openMistakes).toBe(1);
    expect(gA.atRiskCount).toBe(2);

    expect(gB.className).toBe('Gruppe B');
    expect(gB.studentsCount).toBe(2);
    expect(gB.studentsWithData).toBe(2);
    expect(gB.avgSkill).toBe(70);
    expect(gB.tasksDone).toBe(2);
    expect(gB.tasksTotal).toBe(10);
    expect(gB.mockAvgPercent).toBeNull();

    expect(a.totals.classes).toBe(2);
    expect(a.totals.students).toBe(5);
    expect(a.totals.studentsWithData).toBe(5);
    expect(a.totals.activeLast7d).toBe(3);
    expect(a.totals.avgSkill).toBe(64); // (58 + 70) / 2
    expect(a.totals.tasksDone).toBe(15);
    expect(a.totals.tasksTotal).toBe(26);
    expect(a.totals.minutesLast7d).toBe(90);
    expect(a.totals.atRisk).toBe(4);
  });

  it('flags at-risk students with the first matching reason', async () => {
    const a = await loadOrgAnalytics(orgId);
    const reasons = Object.fromEntries(a.atRiskStudents.map((s) => [s.student.name, s.reason]));

    expect(reasons['anas2']).toBe('Skill average below 50%');
    expect(reasons['anas3']).toBe('Inactive for 7+ days');
    expect(reasons['anas4']).toBe('Less than half of tasks completed');
    expect(reasons['anas5']).toBe('No study data yet');
    expect(reasons['anas1']).toBeUndefined();
  });

  it('is org-scoped — another org yields empty analytics', async () => {
    const a = await loadOrgAnalytics(otherOrgId);
    expect(a.classes).toEqual([]);
    expect(a.totals.students).toBe(0);
    expect(a.totals.avgSkill).toBeNull();
    expect(a.atRiskStudents).toEqual([]);
  });
});
