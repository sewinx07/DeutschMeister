import { describe, expect, it } from 'vitest';
import { createEmptySkillState, createInitialDatabase } from '@/lib/db/database';
import { generatePlan } from '@/lib/engine/plan';
import type { Database, MockExamResult, SkillKey, SkillState, StudyTask, UserProfile } from '@/types';

const SKILLS: SkillKey[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];

function makeUser(examInDays = 20): UserProfile {
  const exam = new Date(Date.now() + examInDays * 86400000);
  return {
    id: 'u-test',
    name: 'Test User',
    createdAt: new Date().toISOString(),
    currentLevel: 'A2',
    targetLevel: 'B1',
    examType: 'Goethe-Zertifikat',
    examDate: exam.toISOString().slice(0, 10),
    dailyStudyMinutes: 60,
    strengths: [],
    weaknesses: [],
    targetAusbildung: 'Fachinformatiker',
    itField: 'Anwendungsentwicklung',
    preferredRegions: [],
    onboarded: true,
  };
}

function makeSkills(): Record<SkillKey, SkillState> {
  const record = {} as Record<SkillKey, SkillState>;
  for (const s of SKILLS) record[s] = createEmptySkillState(s);
  return record;
}

function makeMockResult(): MockExamResult {
  return {
    id: 'r-test',
    templateId: 'mock-test',
    name: 'Test',
    level: 'A2',
    date: new Date().toISOString(),
    durationMinutes: 75,
    sectionScores: [],
    totalScore: 0,
    totalMaxScore: 0,
    percent: 0,
    answers: {},
    mistakes: [],
    weakTopics: [],
  };
}

function poolFor(db: Database, type: StudyTask['type']): { id: string }[] {
  switch (type) {
    case 'grammar':
      return db.grammar;
    case 'reading':
      return db.exercises.reading;
    case 'listening':
      return db.exercises.listening;
    case 'writing':
      return db.writingPrompts;
    case 'speaking':
      return db.speakingPrompts;
    case 'mock_exam':
      return db.mockExams;
    default:
      return [];
  }
}

const LINKABLE = ['grammar', 'reading', 'listening', 'writing', 'speaking', 'mock_exam'] as const;

describe('study plan content linking', () => {
  it('content tasks reference existing catalog ids', () => {
    const db = createInitialDatabase();
    const { tasks } = generatePlan(makeUser(), makeSkills(), [], db);
    const linkable = tasks.filter((t) => (LINKABLE as readonly string[]).includes(t.type));

    expect(linkable.length).toBeGreaterThan(0);
    for (const task of linkable) {
      expect(task.sourceId, `${task.type}: ${task.title}`).toBeTruthy();
      const pool = poolFor(db, task.type);
      expect(pool.some((c) => c.id === task.sourceId), `${task.type} resolves`).toBe(true);
    }
  });

  it('mock exam tasks reference an existing template', () => {
    const db = createInitialDatabase();
    const { tasks } = generatePlan(makeUser(), makeSkills(), [makeMockResult()], db);
    const mocks = tasks.filter((t) => t.type === 'mock_exam');

    expect(mocks.length).toBeGreaterThan(0);
    for (const mock of mocks) {
      expect(db.mockExams.some((t) => t.id === mock.sourceId)).toBe(true);
    }
  });

  it('is deterministic across regenerations', () => {
    const db = createInitialDatabase();
    const user = makeUser();
    const skills = makeSkills();

    const a = generatePlan(user, skills, [], db);
    const b = generatePlan(user, skills, [], db);

    expect(a.tasks.length).toBe(b.tasks.length);
    const key = (t: StudyTask) => `${t.type}|${t.sourceId ?? ''}|${t.date}|${t.title}`;
    expect(a.tasks.map(key)).toEqual(b.tasks.map(key));
  });

  it('leaves sourceId undefined without a catalog', () => {
    const { tasks } = generatePlan(makeUser(), makeSkills(), []);
    const content = tasks.filter((t) =>
      ['grammar', 'reading', 'listening', 'writing', 'speaking'].includes(t.type)
    );

    expect(content.length).toBeGreaterThan(0);
    for (const task of content) {
      expect(task.sourceId).toBeUndefined();
    }
  });
});
