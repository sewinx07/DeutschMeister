import type { Database } from '@/types';
import { isoDate } from '../db/storage';
import { streakDays } from './readiness';

export function currentStreak(db: Database): number {
  return streakDays(db);
}

export function totalXp(db: Database): number {
  let xp = 0;
  for (const s of db.studySessions) {
    xp += Math.round(s.durationMinutes / 5);
    if (s.score !== undefined) xp += Math.round(s.score / 20);
  }
  xp += db.vocabulary.filter((v) => v.reviews > 0).length * 2;
  xp += db.mistakes.filter((m) => m.reviewed).length * 3;
  xp += db.mockResults.length * 25;
  return xp;
}

export function xpLevel(xp: number): { level: number; current: number; next: number; progress: number } {
  const level = Math.floor(xp / 250) + 1;
  const current = xp % 250;
  return {
    level,
    current,
    next: 250,
    progress: current / 250,
  };
}

export function evaluateAchievements(db: Database): Database {
  const achievements = db.achievements.map((a) => {
    let progress = a.progress;
    let unlocked = !!a.unlockedAt;
    switch (a.key) {
      case 'streak_7':
        progress = Math.min(a.target, currentStreak(db));
        unlocked = progress >= a.target;
        break;
      case 'words_100':
        progress = Math.min(a.target, db.vocabulary.filter((v) => v.reviews > 0).length);
        unlocked = progress >= a.target;
        break;
      case 'words_10':
        progress = Math.min(a.target, db.vocabulary.filter((v) => v.reviews > 0).length);
        unlocked = progress >= a.target;
        break;
      case 'first_mock':
        progress = Math.min(a.target, db.mockResults.length);
        unlocked = progress >= a.target;
        break;
      case 'mock_3':
        progress = Math.min(a.target, db.mockResults.length);
        unlocked = progress >= a.target;
        break;
      case 'writing_10':
        progress = Math.min(a.target, db.studySessions.filter((s) => s.skill === 'writing' && s.completed).length);
        unlocked = progress >= a.target;
        break;
      case 'speaking_starter':
        progress = Math.min(a.target, db.speakingSessions.length);
        unlocked = progress >= a.target;
        break;
      case 'grammar_5':
        progress = Math.min(a.target, grammarMastered());
        unlocked = progress >= a.target;
        break;
      case 'exam_ready':
        progress = Math.min(a.target, Math.round(db.skills.grammar?.score ?? 0));
        unlocked = progress >= a.target;
        break;
      case 'applications_5':
        progress = Math.min(a.target, db.applications.length);
        unlocked = progress >= a.target;
        break;
      case 'perfect_week':
        progress = Math.min(a.target, perfectDays(db));
        unlocked = progress >= a.target;
        break;
      default:
        break;
    }
    return {
      ...a,
      progress,
      unlockedAt: unlocked ? a.unlockedAt ?? isoDate() : undefined,
    };
  });
  return { ...db, achievements };
}

function grammarMastered(): number {
  return 0; // mastery tracked via skill score improvements
}

function perfectDays(db: Database): number {
  const days = new Set(
    db.studySessions.filter((s) => s.completed).map((s) => new Date(s.startedAt).toDateString())
  );
  let count = 0;
  const cursor = new Date();
  for (let i = 0; i < 7; i++) {
    if (days.has(cursor.toDateString())) count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function unlockedAchievements(db: Database) {
  return db.achievements.filter((a) => a.unlockedAt);
}

export function recentUnlocks(db: Database): Database['achievements'] {
  return db.achievements
    .filter((a) => a.unlockedAt)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
    .slice(0, 3);
}
