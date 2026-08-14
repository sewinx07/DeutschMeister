import type {
  Achievement,
  AppSettings,
  Database,
  GrammarTopic,
  JobApplication,
  SkillKey,
  SkillState,
} from '@/types';
import { buildGrammar } from './seed/grammar';
import { buildListening, buildReading, buildSpeakingPrompts, buildWritingPrompts } from './seed/exercises';
import { buildAchievements, buildDemoDocuments, buildTechSkills } from './seed/misc';
import { buildMockExams } from './seed/mock-exams';
import { buildVocabulary } from './seed/vocabulary';
import { isoDate } from './storage';

export const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  sound: true,
  examMode: false,
  restDayEvery: 7,
  notifications: true,
};

const SKILLS: SkillKey[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];

export function createEmptySkillState(skill: SkillKey): SkillState {
  return {
    skill,
    score: 0,
    previousScore: 0,
    lessonsCompleted: 0,
    practiceMinutes: 0,
  };
}

export function createEmptySkills(): Record<SkillKey, SkillState> {
  const record = {} as Record<SkillKey, SkillState>;
  for (const s of SKILLS) record[s] = createEmptySkillState(s);
  return record;
}

export function createInitialDatabase(): Database {
  const now = isoDate();
  const vocab = buildVocabulary();
  const grammar = buildGrammar();
  const listening = buildListening();
  const reading = buildReading();
  return {
    version: DB_VERSION,
    user: null,
    skills: createEmptySkills(),
    vocabulary: vocab,
    grammar,
    exercises: { listening, reading },
    writingPrompts: buildWritingPrompts(),
    speakingPrompts: buildSpeakingPrompts(),
    speakingSessions: [],
    mockExams: buildMockExams(),
    mockResults: [],
    mistakes: [],
    achievements: buildAchievements(),
    studySessions: [],
    plan: null,
    tasks: [],
    goal: null,
    techSkills: buildTechSkills(),
    projects: [],
    applications: [],
    documents: buildDemoDocuments(),
    settings: { ...DEFAULT_SETTINGS },
    createdAt: now,
  } as Database;
}

export function seedDemoApplications(): JobApplication[] {
  return [];
}

export function pickInitialAssessmentSkills(): Record<SkillKey, SkillState> {
  return createEmptySkills();
}

export type { GrammarTopic, Achievement };
