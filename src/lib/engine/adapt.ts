import type {
  Database,
  Mistake,
  PlanAdjustment,
  SkillKey,
  SkillState,
  StudyPlan,
  StudyTask,
  StudySession,
} from '@/types';
import { todayKey, uid } from '../db/storage';
import { skillScore } from './plan';

export interface WeekPerformance {
  skill: SkillKey;
  averageScore: number;
  attempts: number;
  mistakes: number;
}

export function weeklyPerformance(
  sessions: StudySession[],
  mistakes: Mistake[],
  skills: Record<SkillKey, SkillState>
): WeekPerformance[] {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const result: WeekPerformance[] = [];

  for (const skill of Object.keys(skills) as SkillKey[]) {
    const weekSessions = sessions.filter(
      (s) => s.skill === skill && new Date(s.startedAt) >= weekAgo && s.completed
    );
    const weekMistakes = mistakes.filter(
      (m) => m.category === skill && new Date(m.createdAt) >= weekAgo
    );
    const scores = weekSessions.filter((s) => s.score !== undefined).map((s) => s.score ?? 0);
    const average = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : skillScore(skills, skill);
    result.push({
      skill,
      averageScore: average,
      attempts: weekSessions.length,
      mistakes: weekMistakes.length,
    });
  }
  return result;
}

export interface AdaptResult {
  plan: StudyPlan;
  tasks: StudyTask[];
  adjustments: PlanAdjustment[];
}

export function adaptPlan(
  db: Database,
  skillBoostMinutes: number
): AdaptResult {
  const plan = db.plan!;
  const tasks = [...db.tasks];
  const perf = weeklyPerformance(db.studySessions, db.mistakes, db.skills);

  const weakest = [...perf].sort((a, b) => {
    if (a.attempts === 0 && b.attempts > 0) return -1;
    if (b.attempts === 0 && a.attempts > 0) return 1;
    return a.averageScore - b.averageScore;
  })[0];

  const strongest = [...perf].sort((a, b) => b.averageScore - a.averageScore)[0];

  if (!weakest || !strongest || weakest.skill === strongest.skill) {
    return { plan, tasks, adjustments: [] };
  }

  const today = todayKey();
  const upcoming = tasks
    .filter((t) => t.date >= today && !t.isRest)
    .sort((a, b) => a.date.localeCompare(b.date));

  const targets = upcoming.slice(0, 10);
  const adjustment: PlanAdjustment = {
    id: uid('adj'),
    date: new Date().toISOString(),
    reason: `${weakest.skill} has become your weakest skill this week (avg ${Math.round(weakest.averageScore)}%).`,
    skill: weakest.skill,
    minutesAdded: skillBoostMinutes,
  };

  // Find a strong-skill task among the upcoming targets and trade minutes.
  let removedFrom = 0;
  for (const t of targets) {
    if (t.skill === strongest.skill && t.durationMinutes > 20) {
      const reduction = Math.min(skillBoostMinutes, t.durationMinutes - 15);
      t.durationMinutes = t.durationMinutes - reduction;
      removedFrom = reduction;
      break;
    }
  }

  if (removedFrom > 0) {
    // Add the minutes to a weak-skill task (or split across a few).
    let toAdd = removedFrom;
    for (const t of targets.filter((t) => t.skill === weakest.skill)) {
      if (toAdd <= 0) break;
      const add = Math.min(toAdd, 15);
      t.durationMinutes = t.durationMinutes + add;
      toAdd -= add;
    }
    if (toAdd > 0 && targets.length > 0) {
      const last = targets[targets.length - 1];
      last.durationMinutes = last.durationMinutes + toAdd;
    }
  }

  const nextAdjustments = [...(plan.adjustments || []), adjustment].slice(-10);
  return {
    plan: {
      ...plan,
      lastAdaptedAt: new Date().toISOString(),
      adjustments: nextAdjustments,
    },
    tasks,
    adjustments: nextAdjustments.slice(-1),
  };
}

export function needAdaptation(db: Database): boolean {
  const today = todayKey();
  return db.tasks.some((t) => t.date === today);
}

export function identifyWeakestSkill(skills: Record<SkillKey, SkillState>): SkillKey {
  const entries = Object.entries(skills) as [SkillKey, SkillState][];
  return entries.sort((a, b) => a[1].score - b[1].score)[0][0];
}

export function weakestSkillSummary(
  skills: Record<SkillKey, SkillState>
): { skill: SkillKey; score: number } {
  const skill = identifyWeakestSkill(skills);
  return { skill, score: skills[skill].score };
}

export function getAdaptationReason(db: Database): string | null {
  const last = db.plan?.adjustments?.[db.plan.adjustments.length - 1];
  if (!last) return null;
  const daysAgo = Math.max(0, Math.round((Date.now() - new Date(last.date).getTime()) / 86400000));
  return daysAgo <= 7 ? last.reason : null;
}
