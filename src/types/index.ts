export type SkillKey =
  | 'vocabulary'
  | 'grammar'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'speaking';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type ExamType =
  | 'Goethe-Zertifikat'
  | 'telc Deutsch'
  | 'ÖSD'
  | 'TestDaF'
  | 'DTZ'
  | 'Fachsprachprüfung'
  | 'Other';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  createdAt: string;
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
  examType: ExamType;
  examDate: string;
  dailyStudyMinutes: number;
  strengths: string[];
  weaknesses: string[];
  targetAusbildung: string;
  itField: string;
  preferredRegions: string[];
  onboarded: boolean;
  lastActiveDate?: string;
  timezone?: string;
}

export interface SkillState {
  skill: SkillKey;
  score: number;
  previousScore: number;
  lessonsCompleted: number;
  practiceMinutes: number;
  lastPracticedAt?: string;
}

export const SKILL_LABELS: Record<SkillKey, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

export const SKILL_DESC: Record<SkillKey, string> = {
  vocabulary: 'Wortschatz',
  grammar: 'Grammatik',
  reading: 'Lesen',
  listening: 'Hören',
  writing: 'Schreiben',
  speaking: 'Sprechen',
};

export type Difficulty = 1 | 2 | 3;

export interface VocabularyWord {
  id: string;
  german: string;
  article: string;
  plural?: string;
  english: string;
  ipa?: string;
  example: string;
  exampleEnglish?: string;
  category: string;
  difficulty: Difficulty;
  familiarity: number;
  ease: number;
  interval: number;
  reviews: number;
  dueAt: string;
  lastReviewedAt?: string;
  createdAt: string;
  mastered: boolean;
}

export interface GrammarExercise {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  hint?: string;
  explanation: string;
  type: 'mcq' | 'fill' | 'order';
}

export interface GrammarTopic {
  id: string;
  title: string;
  level: CefrLevel;
  category: string;
  explanation: string;
  examples: { de: string; en: string }[];
  exercises: GrammarExercise[];
  order: number;
}

export interface Question {
  id: string;
  prompt: string;
  type: 'mcq' | 'tf' | 'short';
  options?: string[];
  answer: string;
  explanation: string;
}

export interface ComprehensionItem {
  id: string;
  kind: 'listening' | 'reading';
  level: CefrLevel;
  title: string;
  category: string;
  audioUrl?: string;
  useSpeech?: boolean;
  text: string;
  vocab: { de: string; en: string }[];
  questions: Question[];
  durationMinutes: number;
}

export interface WritingPrompt {
  id: string;
  level: CefrLevel;
  title: string;
  task: string;
  situation: string;
  requirements: string[];
  minWords: number;
  maxWords: number;
  skillFocus: string[];
}

export interface SpeakingPrompt {
  id: string;
  level: CefrLevel;
  title: string;
  topic: string;
  situation: string;
  questions: string[];
  durationMinutes: number;
}

export interface SpeakingSession {
  id: string;
  promptId: string;
  level: CefrLevel;
  date: string;
  recording?: string;
  answers: { question: string; answer: string }[];
  feedback: SpeakingFeedback;
  durationMinutes: number;
}

export interface SpeakingFeedback {
  fluency: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  mistakes: Mistake[];
  strengths: string[];
  recommendedPhrases: string[];
}

export interface ExamItem {
  id: string;
  kind: 'mcq' | 'fill' | 'writing' | 'speaking';
  prompt: string;
  options?: string[];
  answer?: string;
  audio?: string;
  text?: string;
  maxPoints: number;
}

export interface ExamSection {
  id: string;
  name: string;
  skill: SkillKey;
  durationMinutes: number;
  items: ExamItem[];
}

export interface MockExamTemplate {
  id: string;
  name: string;
  examType: ExamType;
  level: CefrLevel;
  durationMinutes: number;
  description: string;
  sections: ExamSection[];
}

export interface SectionScore {
  sectionId: string;
  name: string;
  score: number;
  maxScore: number;
}

export interface MockExamResult {
  id: string;
  templateId: string;
  name: string;
  level: CefrLevel;
  date: string;
  durationMinutes: number;
  sectionScores: SectionScore[];
  totalScore: number;
  totalMaxScore: number;
  percent: number;
  answers: Record<string, string>;
  mistakes: Mistake[];
  weakTopics: string[];
}

export type MistakeCategory =
  | SkillKey
  | 'spelling'
  | 'articles'
  | 'verbs'
  | 'cases'
  | 'word-order';

export interface Mistake {
  id: string;
  category: MistakeCategory;
  subcategory?: string;
  original: string;
  correct: string;
  reason: string;
  relatedTopic?: string;
  createdAt: string;
  reviewDate: string;
  reviewed: boolean;
  timesCorrect: number;
}

export interface StudyPhase {
  id: string;
  name: string;
  start: string;
  end: string;
  focus: string[];
  color: string;
}

export type TaskType =
  | 'grammar'
  | 'vocabulary'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'speaking'
  | 'mock_exam'
  | 'review'
  | 'mistakes'
  | 'rest';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped' | 'rest';

export interface StudyTask {
  id: string;
  date: string;
  skill: SkillKey;
  title: string;
  description?: string;
  durationMinutes: number;
  difficulty: Difficulty;
  status: TaskStatus;
  type: TaskType;
  sourceId?: string;
  phaseId?: string;
  completedAt?: string;
  isRest?: boolean;
  isPlaceholder?: boolean;
}

export interface StudyPhaseDef {
  id: string;
  name: string;
  start: string;
  end: string;
  focus: SkillKey[];
  color: string;
}

export interface StudyPlan {
  id: string;
  generatedAt: string;
  lastAdaptedAt: string;
  examDate: string;
  phases: StudyPhaseDef[];
  adjustments: PlanAdjustment[];
}

export interface PlanAdjustment {
  id: string;
  date: string;
  reason: string;
  skill: SkillKey;
  minutesAdded: number;
}

export interface StudySession {
  id: string;
  taskId?: string;
  skill: SkillKey;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  source?: string;
  score?: number;
  completed: boolean;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number;
  target: number;
}

export interface AusbildungGoal {
  id: string;
  targetField: string;
  targetRoles: string[];
  currentStage: number;
  completedStages: string[];
  notes?: string;
}

export type SkillLevel = 'beginner' | 'basic' | 'intermediate' | 'advanced';

export interface TechnicalSkill {
  id: string;
  name: string;
  category: string;
  level: SkillLevel;
  confidence: number;
  projectsUsed: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  demoUrl?: string;
  status: 'idea' | 'in_progress' | 'done' | 'published';
  skills: string[];
  readmeDone: boolean;
  screenshots: string[];
  createdAt: string;
  updatedAt: string;
}

export type AppStatus =
  | 'researching'
  | 'preparing'
  | 'ready'
  | 'applied'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'waiting';

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  ausbildungType: string;
  city: string;
  state: string;
  website?: string;
  appliedDate?: string;
  deadline?: string;
  status: AppStatus;
  contactPerson?: string;
  contactEmail?: string;
  interviewDate?: string;
  notes?: string;
  documents: string[];
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface Document {
  id: string;
  kind: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  content?: string;
  updatedAt?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  sound: boolean;
  examMode: boolean;
  restDayEvery: number;
  notifications: boolean;
}

export interface Database {
  version: number;
  createdAt?: string;
  user: UserProfile | null;
  skills: Record<SkillKey, SkillState>;
  vocabulary: VocabularyWord[];
  grammar: GrammarTopic[];
  exercises: {
    listening: ComprehensionItem[];
    reading: ComprehensionItem[];
  };
  writingPrompts: WritingPrompt[];
  speakingPrompts: SpeakingPrompt[];
  speakingSessions: SpeakingSession[];
  mockExams: MockExamTemplate[];
  mockResults: MockExamResult[];
  mistakes: Mistake[];
  achievements: Achievement[];
  studySessions: StudySession[];
  plan: StudyPlan | null;
  tasks: StudyTask[];
  goal: AusbildungGoal | null;
  techSkills: TechnicalSkill[];
  projects: Project[];
  applications: JobApplication[];
  documents: Document[];
  settings: AppSettings;
}

/**
 * The user-owned slice of the database that is persisted server-side per
 * (organization, user). Catalog content (grammar topics, comprehension items,
 * prompts, mock exam templates) and career data stay client-side.
 */
export type StudyState = Pick<
  Database,
  | 'user'
  | 'skills'
  | 'vocabulary'
  | 'plan'
  | 'tasks'
  | 'studySessions'
  | 'mockResults'
  | 'mistakes'
  | 'achievements'
  | 'speakingSessions'
  | 'settings'
>;

/**
 * Read-only summary of a learner's study state, used by the teacher progress
 * view. Never includes private free-text data beyond recent mistakes.
 */
export interface StudySummary {
  onboarded: boolean;
  skills: Record<SkillKey, SkillState>;
  tasksTotal: number;
  tasksDone: number;
  studyMinutesTotal: number;
  sessionsLast7d: number;
  minutesLast7d: number;
  lastActiveAt: string | null;
  vocabularyTotal: number;
  vocabularyMastered: number;
  vocabularyDue: number;
  mockExamsTaken: number;
  mockAvgPercent: number | null;
  mockBestPercent: number | null;
  openMistakes: number;
  recentMistakes: Mistake[];
  currentLevel: string;
  targetLevel: string;
  examDate: string | null;
  daysUntilExam: number | null;
  currentPhase: string | null;
}

export type AiProvider = 'openai' | 'anthropic';

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ReadinessReport {
  score: number;
  target: number;
  confidence: 'Low' | 'Moderate' | 'High';
  biggestRisk: SkillKey | null;
  recommendedAction: string;
  factors: { label: string; value: number; weight: number }[];
}
