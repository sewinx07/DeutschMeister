import type { Achievement, Document, TechnicalSkill } from '@/types';
import { addDays, uid } from '../storage';

export interface TechSkillSeed {
  name: string;
  category: string;
  level: TechnicalSkill['level'];
  confidence: number;
  projectsUsed: number;
}

const techSkillSeeds: TechSkillSeed[] = [
  { name: 'Python', category: 'Programming', level: 'basic', confidence: 0.35, projectsUsed: 1 },
  { name: 'JavaScript', category: 'Programming', level: 'intermediate', confidence: 0.6, projectsUsed: 2 },
  { name: 'TypeScript', category: 'Programming', level: 'basic', confidence: 0.4, projectsUsed: 1 },
  { name: 'Java', category: 'Programming', level: 'beginner', confidence: 0.2, projectsUsed: 0 },
  { name: 'C/C++', category: 'Programming', level: 'beginner', confidence: 0.15, projectsUsed: 0 },
  { name: 'HTML', category: 'Web', level: 'advanced', confidence: 0.85, projectsUsed: 3 },
  { name: 'CSS', category: 'Web', level: 'advanced', confidence: 0.8, projectsUsed: 3 },
  { name: 'React', category: 'Web', level: 'basic', confidence: 0.45, projectsUsed: 1 },
  { name: 'Next.js', category: 'Web', level: 'basic', confidence: 0.4, projectsUsed: 1 },
  { name: 'Linux', category: 'Systems', level: 'basic', confidence: 0.4, projectsUsed: 1 },
  { name: 'Windows', category: 'Systems', level: 'intermediate', confidence: 0.7, projectsUsed: 3 },
  { name: 'Networking', category: 'Systems', level: 'beginner', confidence: 0.2, projectsUsed: 0 },
  { name: 'Git', category: 'Systems', level: 'intermediate', confidence: 0.65, projectsUsed: 2 },
  { name: 'Docker', category: 'Systems', level: 'beginner', confidence: 0.2, projectsUsed: 0 },
  { name: 'SQL', category: 'Databases', level: 'basic', confidence: 0.35, projectsUsed: 1 },
  { name: 'PostgreSQL', category: 'Databases', level: 'basic', confidence: 0.3, projectsUsed: 0 },
  { name: 'MySQL', category: 'Databases', level: 'beginner', confidence: 0.2, projectsUsed: 0 },
  { name: 'GitHub', category: 'Other', level: 'intermediate', confidence: 0.7, projectsUsed: 3 },
  { name: 'APIs', category: 'Other', level: 'basic', confidence: 0.4, projectsUsed: 1 },
  { name: 'Cybersecurity', category: 'Other', level: 'beginner', confidence: 0.1, projectsUsed: 0 },
  { name: 'Cloud', category: 'Other', level: 'beginner', confidence: 0.1, projectsUsed: 0 },
];

export function buildTechSkills(): TechnicalSkill[] {
  return techSkillSeeds.map((s) => ({
    id: uid('ts'),
    name: s.name,
    category: s.category,
    level: s.level,
    confidence: s.confidence,
    projectsUsed: s.projectsUsed,
  }));
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  unlockedAt?: string;
}

const achievementDefs: AchievementDef[] = [
  { key: 'first_session', title: 'First Study Session', description: 'Complete your first study task.', icon: 'rocket', target: 1, progress: 0 },
  { key: 'streak_7', title: '7 Day Streak', description: 'Study on 7 consecutive days.', icon: 'flame', target: 7, progress: 0 },
  { key: 'words_100', title: '100 Words', description: 'Learn 100 vocabulary words.', icon: 'book', target: 100, progress: 0 },
  { key: 'words_10', title: 'First 10 Words', description: 'Learn your first 10 words.', icon: 'sparkles', target: 10, progress: 0 },
  { key: 'first_mock', title: 'First Mock Exam', description: 'Complete a full mock exam.', icon: 'target', target: 1, progress: 0 },
  { key: 'writing_10', title: '10 Writing Exercises', description: 'Complete 10 writing exercises.', icon: 'pen', target: 10, progress: 0 },
  { key: 'speaking_starter', title: 'Speaking Starter', description: 'Complete your first speaking session.', icon: 'mic', target: 1, progress: 0 },
  { key: 'grammar_5', title: 'Grammar Master (5 topics)', description: 'Master 5 grammar topics.', icon: 'layers', target: 5, progress: 0 },
  { key: 'mock_3', title: '3 Mock Exams', description: 'Take 3 mock exams.', icon: 'gauge', target: 3, progress: 0 },
  { key: 'exam_ready', title: 'Exam Ready', description: 'Reach 80% exam readiness.', icon: 'medal', target: 80, progress: 0 },
  { key: 'applications_5', title: 'Application Hunter', description: 'Track 5 applications.', icon: 'send', target: 5, progress: 0 },
  { key: 'perfect_week', title: 'Perfect Week', description: 'Complete all tasks for 7 days in a week.', icon: 'star', target: 7, progress: 0 },
];

export function buildAchievements(): Achievement[] {
  return achievementDefs.map((a) => ({
    id: uid('ach'),
    key: a.key,
    title: a.title,
    description: a.description,
    icon: a.icon,
    unlockedAt: a.unlockedAt,
    progress: a.progress,
    target: a.target,
  }));
}

export function buildDemoDocuments(): Document[] {
  return [
    {
      id: uid('doc'),
      kind: 'Lebenslauf',
      title: 'Lebenslauf (CV)',
      status: 'in_progress',
      content: 'Experience, education, IT skills and projects in a clean ATS-friendly layout.',
      updatedAt: addDays(new Date(), -2).toISOString(),
    },
    {
      id: uid('doc'),
      kind: 'Anschreiben',
      title: 'Anschreiben (Cover letter)',
      status: 'todo',
      content: 'Tailor a German cover letter for each application.',
    },
    {
      id: uid('doc'),
      kind: 'Zeugnisse',
      title: 'Zeugnisse & certificates',
      status: 'done',
      content: 'Scanned school certificates and language test results.',
      updatedAt: addDays(new Date(), -4).toISOString(),
    },
  ];
}
