import type { Database, SkillKey, SkillState, StudySession } from '@/types';
import { addDays, dayKey, startOfDay } from '../db/storage';

export interface DayBucket {
  date: string;
  label: string;
  minutes: number;
  tasksCompleted: number;
}

export function studyMinutesPerDay(
  sessions: StudySession[],
  days = 14
): DayBucket[] {
  const start = startOfDay(addDays(new Date(), -(days - 1)));
  const buckets: DayBucket[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const key = dayKey(d);
    const daySessions = sessions.filter((s) => {
      const sDay = dayKey(new Date(s.startedAt));
      return sDay === key;
    });
    buckets.push({
      date: key,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      minutes: daySessions.reduce((a, s) => a + s.durationMinutes, 0),
      tasksCompleted: daySessions.filter((s) => s.completed).length,
    });
  }
  return buckets;
}

export function totalStudyMinutes(sessions: StudySession[]): number {
  return sessions.reduce((a, s) => a + s.durationMinutes, 0);
}

export function weeklyStudyMinutes(sessions: StudySession[]): number {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  return sessions
    .filter((s) => new Date(s.startedAt) >= weekAgo)
    .reduce((a, s) => a + s.durationMinutes, 0);
}

export interface SkillTrendPoint {
  skill: SkillKey;
  current: number;
  previous: number;
  change: number;
}

export function skillTrends(db: Database): SkillTrendPoint[] {
  return (Object.entries(db.skills) as [SkillKey, SkillState][]).map(
    ([skill, state]) => ({
      skill,
      current: state.score,
      previous: state.previousScore,
      change: state.score - state.previousScore,
    })
  );
}

export function minutesBySkill(db: Database): { skill: SkillKey; minutes: number }[] {
  const map: Record<SkillKey, number> = {
    vocabulary: 0,
    grammar: 0,
    reading: 0,
    listening: 0,
    writing: 0,
    speaking: 0,
  };
  for (const s of db.studySessions) {
    map[s.skill] = (map[s.skill] ?? 0) + s.durationMinutes;
  }
  return (Object.entries(map) as [SkillKey, number][]).map(([skill, minutes]) => ({
    skill,
    minutes,
  }));
}

export function mockExamTrend(results: { date: string; percent: number }[]) {
  return [...results]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r) => ({ date: r.date, percent: r.percent }));
}

export function mistakesByCategory(db: Database): { category: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const m of db.mistakes) {
    const key = m.category === 'speaking' ? 'speaking' : m.category;
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map).map(([category, count]) => ({ category, count }));
}

export interface WeekGoals {
  targetMinutes: number;
  actualMinutes: number;
  targetTasks: number;
  actualTasks: number;
  completionRate: number;
}

export function weekGoals(db: Database): WeekGoals {
  const sessionsThisWeek = db.studySessions.filter(
    (s) => new Date(s.startedAt) >= new Date(Date.now() - 7 * 86400000)
  );
  const actualMinutes = sessionsThisWeek.reduce((a, s) => a + s.durationMinutes, 0);
  const dailyTarget = db.user?.dailyStudyMinutes ?? 60;
  const targetMinutes = dailyTarget * 7;
  const targetTasks = 7 * 4;
  const actualTasks = sessionsThisWeek.filter((s) => s.completed).length;
  return {
    targetMinutes,
    actualMinutes,
    targetTasks,
    actualTasks,
    completionRate: Math.min(1, actualMinutes / targetMinutes),
  };
}

export function vocabularyStats(db: Database) {
  const total = db.vocabulary.length;
  const mastered = db.vocabulary.filter((v) => v.mastered).length;
  const learned = db.vocabulary.filter((v) => v.reviews > 0 || v.familiarity > 0.2).length;
  const due = db.vocabulary.filter((v) => !v.mastered && new Date(v.dueAt) <= new Date()).length;
  return { total, mastered, learned, due };
}

export function applicationStats(db: Database) {
  const all = db.applications;
  return {
    total: all.length,
    applied: all.filter((a) => ['applied', 'interview', 'accepted', 'waiting'].includes(a.status)).length,
    interviews: all.filter((a) => a.status === 'interview').length,
    accepted: all.filter((a) => a.status === 'accepted').length,
  };
}
