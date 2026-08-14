import type {
  MockExamResult,
  ReadinessReport,
  SkillKey,
  SkillState,
  UserProfile,
} from '@/types';
import { diffDays } from '../db/storage';
import { computeSkillWeights } from './plan';

export const READINESS_TARGET = 80;

export function skillAverage(skills: Record<SkillKey, SkillState>): number {
  const values = Object.values(skills).map((s) => s.score);
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function mockAverage(results: MockExamResult[]): number | null {
  if (!results.length) return null;
  return results.reduce((a, r) => a + r.percent, 0) / results.length;
}

export function streakDays(db: { studySessions: { startedAt: string; completed: boolean }[] }): number {
  const completedDates = new Set(
    db.studySessions
      .filter((s) => s.completed)
      .map((s) => new Date(s.startedAt).toDateString())
  );
  let streak = 0;
  const cursor = new Date();
  while (completedDates.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function consistencyScore(db: { studySessions: { startedAt: string; completed: boolean }[] }): number {
  const streak = streakDays(db);
  return Math.min(1, streak / 14);
}

export function computeReadiness(
  user: UserProfile,
  skills: Record<SkillKey, SkillState>,
  mockResults: MockExamResult[],
  consistency: number,
  completedTasks: number
): ReadinessReport {
  const weights = computeSkillWeights(skills);

  let skillComponent = 0;
  for (const [skill, state] of Object.entries(skills) as [SkillKey, SkillState][]) {
    skillComponent += state.score * (weights[skill] ?? 1 / 6);
  }

  const avgSkill = skillAverage(skills);
  const mockAvg = mockAverage(mockResults);
  const mockComponent = mockAvg !== null ? mockAvg : avgSkill * 0.8;

  const daysLeft = Math.max(0, diffDays(new Date(), new Date(user.examDate)));
  const daysFactor = Math.min(1, daysLeft / 60 + 0.5);

  const weakest = (Object.entries(skills) as [SkillKey, SkillState][]).sort(
    (a, b) => a[1].score - b[1].score
  )[0];

  let score =
    skillComponent * 0.5 +
    mockComponent * 0.3 +
    (avgSkill * 0.1) +
    consistency * 8 +
    Math.min(6, completedTasks / 12) +
    (daysLeft > 0 ? 2 : -4);

  score = Math.max(0, Math.min(100, Math.round(score)));

  const biggestRisk = weakest && weakest[1].score < READINESS_TARGET - 10 ? weakest[0] : null;

  let recommendedAction: string;
  if (daysLeft <= 7 && score < READINESS_TARGET) {
    recommendedAction = `Your exam is in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Focus on timed mock exams and your weakest skill (${biggestRisk ?? 'mixed'}). Protect your writing and speaking sections.`;
  } else if (biggestRisk) {
    recommendedAction = `You are improving, but ${biggestRisk} remains your biggest risk. Complete 3 ${biggestRisk} sessions this week.`;
  } else if (score >= READINESS_TARGET) {
    recommendedAction = 'You look ready. Keep your routine light, review your mistake bank, and rest before the exam.';
  } else {
    recommendedAction = 'Keep a steady daily routine and target your weakest skill with focused practice.';
  }

  const confidence: ReadinessReport['confidence'] =
    score >= 75 ? 'High' : score >= 55 ? 'Moderate' : 'Low';

  return {
    score,
    target: READINESS_TARGET,
    confidence,
    biggestRisk,
    recommendedAction,
    factors: [
      { label: 'Skill average', value: avgSkill, weight: 0.5 },
      { label: 'Mock exams', value: mockAvg ?? avgSkill, weight: 0.3 },
      { label: 'Consistency', value: consistency * 100, weight: 0.1 },
      { label: 'Days remaining', value: daysFactor * 100, weight: 0.1 },
    ],
  };
}

export function readinessLabel(score: number): string {
  if (score >= 80) return 'Ready';
  if (score >= 60) return 'On track';
  if (score >= 40) return 'Developing';
  return 'Just started';
}
