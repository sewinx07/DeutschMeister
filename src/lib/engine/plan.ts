import type {
  CefrLevel,
  Difficulty,
  MockExamResult,
  SkillKey,
  SkillState,
  StudyPhaseDef,
  StudyPlan,
  StudyTask,
  UserProfile,
} from '@/types';
import {
  addDays,
  dayKey,
  diffDays,
  formatDate,
  isoDate,
  startOfDay,
  todayKey,
  uid,
} from '../db/storage';

export const SKILL_ORDER: SkillKey[] = [
  'grammar',
  'vocabulary',
  'listening',
  'reading',
  'writing',
  'speaking',
];

export interface PhaseColors {
  [key: string]: string;
}

const PHASE_COLORS: PhaseColors = {
  Assessment: 'sky',
  Foundation: 'indigo',
  SkillDevelopment: 'violet',
  ExamSimulation: 'amber',
  FinalRevision: 'rose',
};

export function skillScore(skills: Record<SkillKey, SkillState>, skill: SkillKey): number {
  return skills[skill]?.score ?? 0;
}

export function computeSkillWeights(
  skills: Record<SkillKey, SkillState>
): Record<SkillKey, number> {
  const scores = SKILL_ORDER.map((s) => skillScore(skills, s));
  const maxScore = Math.max(...scores, 1);
  const raw: Record<SkillKey, number> = {} as Record<SkillKey, number>;
  let total = 0;
  for (const s of SKILL_ORDER) {
    const deficit = maxScore - skillScore(skills, s) + 15;
    raw[s] = Math.max(5, deficit * deficit);
    total += raw[s];
  }
  const weights = {} as Record<SkillKey, number>;
  for (const s of SKILL_ORDER) weights[s] = raw[s] / total;
  return weights;
}

export function getLevelRank(level: CefrLevel): number {
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(level) + 1;
}

export interface PhaseResult {
  phases: StudyPhaseDef[];
  days: string[];
}

export function computePhases(
  start: Date,
  examDate: Date
): PhaseResult {
  const totalDays = Math.max(2, diffDays(start, examDate));
  const phaseRanges: [number, number][] = [
    [0, Math.max(1, Math.round(totalDays * 0.08))],
    [Math.max(1, Math.round(totalDays * 0.08)), Math.round(totalDays * 0.4)],
    [Math.round(totalDays * 0.4), Math.round(totalDays * 0.72)],
    [Math.round(totalDays * 0.72), Math.round(totalDays * 0.9)],
    [Math.round(totalDays * 0.9), totalDays],
  ];

  const phaseDefs: Omit<StudyPhaseDef, 'id' | 'start' | 'end'>[] = [
    { name: 'Assessment', focus: ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'], color: PHASE_COLORS.Assessment },
    { name: 'Foundation', focus: ['vocabulary', 'grammar'], color: PHASE_COLORS.Foundation },
    { name: 'Skill Development', focus: ['reading', 'listening', 'writing', 'speaking', 'vocabulary'], color: PHASE_COLORS.SkillDevelopment },
    { name: 'Exam Simulation', focus: ['listening', 'reading', 'writing', 'speaking'], color: PHASE_COLORS.ExamSimulation },
    { name: 'Final Revision', focus: ['vocabulary', 'grammar', 'reading'], color: PHASE_COLORS.FinalRevision },
  ];

  const phases: StudyPhaseDef[] = phaseDefs.map((p, i) => {
    const [s, e] = phaseRanges[i];
    const startDate = addDays(start, s);
    const endDate = addDays(start, Math.min(e, totalDays));
    return {
      id: uid('ph'),
      ...p,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    } as StudyPhaseDef;
  });

  const days: string[] = [];
  for (let i = 0; i <= totalDays; i++) {
    days.push(dayKey(addDays(start, i)));
  }
  return { phases, days };
}

export function phaseForDate(phases: StudyPhaseDef[], date: string): StudyPhaseDef | undefined {
  return phases.find((p) => date >= dayKey(new Date(p.start)) && date <= dayKey(new Date(p.end)));
}

interface TaskSpec {
  type: StudyTask['type'];
  skill: SkillKey;
  title: string;
  description: string;
  durationMinutes: number;
  difficulty: Difficulty;
  phaseFilter?: string[];
}

const TASK_LIBRARY: TaskSpec[] = [
  { type: 'vocabulary', skill: 'vocabulary', title: 'Vocabulary — spaced repetition', description: 'Review due words with flashcards.', durationMinutes: 12, difficulty: 1 },
  { type: 'grammar', skill: 'grammar', title: 'Grammar practice', description: 'Complete a grammar topic and its exercises.', durationMinutes: 25, difficulty: 2 },
  { type: 'vocabulary', skill: 'vocabulary', title: 'New vocabulary', description: 'Learn 8–10 new words in a category.', durationMinutes: 15, difficulty: 2 },
  { type: 'listening', skill: 'listening', title: 'Listening exercise', description: 'Listen and answer comprehension questions.', durationMinutes: 25, difficulty: 2 },
  { type: 'reading', skill: 'reading', title: 'Reading comprehension', description: 'Read a text and answer questions.', durationMinutes: 20, difficulty: 2 },
  { type: 'writing', skill: 'writing', title: 'Writing practice', description: 'Write a short text; get AI feedback.', durationMinutes: 20, difficulty: 2 },
  { type: 'speaking', skill: 'speaking', title: 'Speaking practice', description: 'Practise a speaking scenario.', durationMinutes: 15, difficulty: 2 },
  { type: 'mistakes', skill: 'grammar', title: 'Mistake review', description: 'Review your mistake bank.', durationMinutes: 12, difficulty: 1 },
  { type: 'grammar', skill: 'grammar', title: 'Grammar review', description: 'Re-read a grammar topic.', durationMinutes: 15, difficulty: 1 },
  { type: 'review', skill: 'vocabulary', title: 'Word review', description: 'Quick vocabulary review.', durationMinutes: 10, difficulty: 1 },
];

const ASSESSMENT_TASKS: TaskSpec[] = [
  { type: 'review', skill: 'vocabulary', title: 'Vocabulary assessment', description: 'Quick vocabulary check.', durationMinutes: 12, difficulty: 1 },
  { type: 'grammar', skill: 'grammar', title: 'Grammar assessment', description: 'Quick grammar check.', durationMinutes: 15, difficulty: 1 },
  { type: 'reading', skill: 'reading', title: 'Reading assessment', description: 'Short reading check.', durationMinutes: 12, difficulty: 1 },
  { type: 'listening', skill: 'listening', title: 'Listening assessment', description: 'Short listening check.', durationMinutes: 12, difficulty: 1 },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateTasksForDay(
  date: string,
  user: UserProfile,
  skills: Record<SkillKey, SkillState>,
  phase: StudyPhaseDef,
  mockTemplatesAvailable: boolean,
  dailyIndex: number
): StudyTask[] {
  const isRest = isRestDay(date, user, dailyIndex);
  if (isRest) {
    return [{
      id: uid('task'),
      date,
      skill: 'vocabulary',
      title: 'Rest day',
      description: 'Recovery day. Light optional practice only.',
      durationMinutes: 0,
      difficulty: 1,
      status: 'rest',
      type: 'rest',
      isRest: true,
    }];
  }

  const tasks: StudyTask[] = [];
  let remaining = user.dailyStudyMinutes;

  const weights = computeSkillWeights(skills);
  const phaseName = phase.name;

  if (phaseName === 'Assessment') {
    for (const spec of ASSESSMENT_TASKS) {
      tasks.push(makeTask(date, spec, phase.id));
      remaining -= spec.durationMinutes;
    }
    return clampToRemaining(tasks);
  }

  if (phaseName === 'Exam Simulation') {
    // Inject a mock exam on some days.
    if (dailyIndex % 3 === 1 && mockTemplatesAvailable) {
      const mock = makeMockTask(date, phase.id);
      tasks.push(mock);
      remaining -= mock.durationMinutes;
    }
  }

  // Base mandatory: SRS + a mistake review a couple of times a week.
  if (dailyIndex % 4 !== 0) {
    const srs = TASK_LIBRARY[0];
    tasks.push(makeTask(date, srs, phase.id));
    remaining -= srs.durationMinutes;
  }
  if (dailyIndex % 3 === 0 && phaseName !== 'Foundation') {
    const mis = TASK_LIBRARY[7];
    tasks.push(makeTask(date, mis, phase.id));
    remaining -= mis.durationMinutes;
  }

  if (phaseName === 'Final Revision') {
    const rev = TASK_LIBRARY[8];
    tasks.push(makeTask(date, rev, phase.id));
    remaining -= rev.durationMinutes;
  }

  // Allocate remaining minutes weighted by skill weakness.
  const skillTasks: Record<SkillKey, TaskSpec[]> = {
    grammar: [TASK_LIBRARY[1], TASK_LIBRARY[8]],
    vocabulary: [TASK_LIBRARY[2], TASK_LIBRARY[9]],
    listening: [TASK_LIBRARY[3]],
    reading: [TASK_LIBRARY[4]],
    writing: [TASK_LIBRARY[5]],
    speaking: [TASK_LIBRARY[6]],
  };

  const order = [...SKILL_ORDER].sort(
    (a, b) => weights[b] - weights[a]
  );
  for (const skill of order) {
    if (remaining <= 5) break;
    if (!phase.focus.includes(skill)) continue;
    const spec = pick(skillTasks[skill] || [TASK_LIBRARY[4]], dailyIndex + SKILL_ORDER.indexOf(skill));
    const minutes = Math.min(Math.max(10, Math.round(weights[skill] * user.dailyStudyMinutes * 0.9)), remaining);
    tasks.push(makeTask(date, { ...spec, durationMinutes: minutes }, phase.id));
    remaining -= minutes;
  }

  if (remaining >= 8) {
    tasks.push(makeTask(date, TASK_LIBRARY[2], phase.id));
  }

  return tasks;
}

function makeTask(date: string, spec: TaskSpec, phaseId: string): StudyTask {
  return {
    id: uid('task'),
    date,
    skill: spec.skill,
    title: spec.title,
    description: spec.description,
    durationMinutes: spec.durationMinutes,
    difficulty: spec.difficulty,
    status: 'pending',
    type: spec.type,
    phaseId,
    sourceId: undefined,
  };
}

function makeMockTask(date: string, phaseId: string): StudyTask {
  return {
    id: uid('task'),
    date,
    skill: 'listening',
    title: 'Full mock exam',
    description: 'Complete a timed mock exam in exam mode.',
    durationMinutes: 75,
    difficulty: 3,
    status: 'pending',
    type: 'mock_exam',
    phaseId,
  };
}

function clampToRemaining(tasks: StudyTask[]): StudyTask[] {
  return tasks;
}

export function isRestDay(date: string, user: UserProfile, index: number): boolean {
  const every = user.dailyStudyMinutes >= 90 ? 6 : 7;
  return index > 0 && index % every === 0;
}

export interface GeneratedPlan {
  plan: StudyPlan;
  tasks: StudyTask[];
}

export function generatePlan(
  user: UserProfile,
  skills: Record<SkillKey, SkillState>,
  mockResults: MockExamResult[]
): GeneratedPlan {
  const start = startOfDay(new Date());
  const exam = startOfDay(new Date(user.examDate));
  const { phases, days } = computePhases(start, exam);
  const daysLeft = Math.max(0, diffDays(start, exam));

  const plan: StudyPlan = {
    id: uid('plan'),
    generatedAt: isoDate(),
    lastAdaptedAt: isoDate(),
    examDate: exam.toISOString(),
    phases,
    adjustments: [],
  };

  const hasMock = mockResults.length > 0;
  const tasks: StudyTask[] = [];
  days.forEach((date, i) => {
    const phase = phaseForDate(phases, date) ?? phases[phases.length - 1];
    const dayTasks = generateTasksForDay(date, user, skills, phase, hasMock || daysLeft > 10, i);
    tasks.push(...dayTasks);
  });

  return { plan, tasks };
}

export function generatePlanLabel(user: UserProfile): { phasesLabel: string; focusLabel: string } {
  const phasesLabel = '5 Phases';
  const focusLabel = user.weaknesses.length > 0 ? user.weaknesses[0] : 'All skills';
  return { phasesLabel, focusLabel };
}

export function planSummary(plan: StudyPlan): { count: number; lastAdapted: string } {
  return {
    count: plan.phases.length,
    lastAdapted: formatDate(plan.lastAdaptedAt),
  };
}

export function upcomingTasks(tasks: StudyTask[], from = new Date(), count = 7): StudyTask[] {
  const key = dayKey(from);
  return tasks
    .filter((t) => t.date >= key && !t.isRest)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

export function todaysTasks(tasks: StudyTask[]): StudyTask[] {
  const key = todayKey();
  return tasks.filter((t) => t.date === key);
}

export function isPlanFresh(plan: StudyPlan | null, maxAgeDays = 1): boolean {
  if (!plan) return false;
  const age = diffDays(new Date(plan.lastAdaptedAt), new Date());
  return age <= maxAgeDays;
}

