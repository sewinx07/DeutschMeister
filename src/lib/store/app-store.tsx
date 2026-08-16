'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type {
  Database,
  JobApplication,
  Mistake,
  MockExamResult,
  Project,
  SkillKey,
  SpeakingSession,
  StudyState,
  StudyTask,
  TechnicalSkill,
  UserProfile,
} from '@/types';
import { createInitialDatabase, DB_VERSION } from '../db/database';
import { loadDB, saveDB, uid } from '../db/storage';
import { applySrsReview, ReviewRating } from '../engine/srs';
import { generatePlan } from '../engine/plan';
import { adaptPlan } from '../engine/adapt';
import { evaluateAchievements } from '../engine/gamify';
import { authClient } from '@/lib/auth/client';
import {
  loadStudyState,
  saveStudyState,
  clearStudyStateServer,
  updateStudyProfileName,
} from '@/lib/server/actions/study';

interface AppStore {
  db: Database | null;
  updateUser: (partial: Partial<UserProfile>) => void;
  completeOnboarding: (profile: UserProfile, skillScores: Partial<Record<SkillKey, number>>) => void;
  completeTask: (taskId: string, score?: number) => void;
  startTask: (taskId: string) => void;
  skipTask: (taskId: string) => void;
  addTask: (task: StudyTask) => void;
  updateTask: (taskId: string, partial: Partial<StudyTask>) => void;
  removeTask: (taskId: string) => void;
  logStudySession: (input: { skill: SkillKey; minutes: number; score?: number; source?: string; taskId?: string }) => void;
  reviewWord: (wordId: string, rating: ReviewRating) => void;
  addNewWord: () => void;
  submitMockResult: (result: MockExamResult) => void;
  addMistake: (mistake: Omit<Mistake, 'id' | 'createdAt' | 'reviewed' | 'timesCorrect'>) => void;
  markMistakeReviewed: (id: string) => void;
  deleteMistake: (id: string) => void;
  generateStudyPlan: () => void;
  adaptStudyPlan: () => void;
  saveSpeakingSession: (session: SpeakingSession) => void;
  upsertApplication: (app: JobApplication) => void;
  deleteApplication: (id: string) => void;
  upsertProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  updateTechSkill: (id: string, partial: Partial<TechnicalSkill>) => void;
  updateDocument: (id: string, partial: Partial<Database['documents'][number]>) => void;
  updateSettings: (partial: Partial<Database['settings']>) => void;
  resetAll: () => void;
}

const StoreContext = createContext<AppStore | null>(null);

function skillDeltaForTask(type: StudyTask['type']): number {
  switch (type) {
    case 'mock_exam':
      return 4;
    case 'writing':
    case 'speaking':
      return 2.5;
    default:
      return 2;
  }
}

/** The slice of the database that is persisted server-side per (org, user). */
function studySlice(db: Database): StudyState {
  return {
    user: db.user,
    skills: db.skills,
    vocabulary: db.vocabulary,
    plan: db.plan,
    tasks: db.tasks,
    studySessions: db.studySessions,
    mockResults: db.mockResults,
    mistakes: db.mistakes,
    achievements: db.achievements,
    speakingSessions: db.speakingSessions,
    settings: db.settings,
  };
}

function parseLocalDB(raw: string | null): Database | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Database;
  } catch {
    return null;
  }
}

/** Combine server-persisted study state with the deterministic catalog and device-local career data. */
function mergeStudyState(study: StudyState, local: Database | null): Database {
  const base = createInitialDatabase();
  return {
    ...base,
    ...study,
    version: DB_VERSION,
    createdAt: study.user?.createdAt ?? base.createdAt,
    goal: local?.goal ?? base.goal,
    techSkills: local?.techSkills ?? base.techSkills,
    projects: local?.projects ?? base.projects,
    applications: local?.applications ?? base.applications,
    documents: local?.documents ?? base.documents,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const authed = Boolean(session?.user);
  const userId = session?.user?.id ?? null;
  const syncQueue = useRef(Promise.resolve());

  const pushSync = useCallback((state: StudyState) => {
    syncQueue.current = syncQueue.current
      .then(async () => {
        await saveStudyState(state);
      })
      .catch(() => {
        /* offline/lost sync is acceptable — the local backup is always kept */
      });
  }, []);

  const persist = useCallback(
    (next: Database) => {
      const evaluated = evaluateAchievements(next);
      setDb(evaluated);
      saveDB(JSON.stringify(evaluated));
      if (authed) {
        pushSync(studySlice(evaluated));
      }
    },
    [authed, pushSync]
  );

  useEffect(() => {
    if (sessionPending) return;

    let cancelled = false;
    (async () => {
      const local = parseLocalDB(loadDB());
      if (!authed || !userId) {
        if (local && local.version === DB_VERSION) {
          if (!cancelled) setDb(local);
          return;
        }
        const fresh = createInitialDatabase();
        if (!cancelled) setDb(fresh);
        saveDB(JSON.stringify(fresh));
        return;
      }

      const res = await loadStudyState();
      if (cancelled) return;
      if (!res.ok) {
        // No org access (or transient failure): fall back to the local backup.
        if (local && local.version === DB_VERSION) {
          setDb(local);
        } else {
          setDb(createInitialDatabase());
        }
        return;
      }
      const study = res.data;

      // First login with existing local progress: migrate the local study slice
      // to the server so no progress is lost across devices.
      if (!study.user?.onboarded && local?.user?.onboarded) {
        const imported = studySlice(local);
        try {
          const saved = await saveStudyState(imported);
          if (saved.ok) {
            const merged = mergeStudyState(imported, local);
            setDb(merged);
            saveDB(JSON.stringify(merged));
            return;
          }
        } catch {
          /* fall through to server state */
        }
      }

      const merged = mergeStudyState(study, local);
      setDb(merged);
      saveDB(JSON.stringify(merged));
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionPending, authed, userId, pathname]);

  useEffect(() => {
    if (!db || !db.user || !db.user.onboarded) {
      return;
    }
    if (!db.plan || db.tasks.length === 0) {
      const { plan, tasks } = generatePlan(db.user, db.skills, db.mockResults);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time plan bootstrap after hydration
      persist({ ...db, plan, tasks });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db?.user?.onboarded, db?.plan?.id]);

  const updateUser = useCallback(
    (partial: Partial<UserProfile>) => {
      if (!db) return;
      if (authed && partial.name && partial.name !== db.user?.name) {
        void updateStudyProfileName(partial.name);
      }
      persist({ ...db, user: db.user ? { ...db.user, ...partial } : partial as UserProfile });
    },
    [db, authed, persist]
  );

  const completeOnboarding = useCallback(
    (profile: UserProfile, skillScores: Partial<Record<SkillKey, number>>) => {
      if (!db) return;
      const skills = { ...db.skills };
      (Object.keys(skillScores) as SkillKey[]).forEach((key) => {
        const score = Math.round(skillScores[key] ?? 0);
        skills[key] = {
          ...skills[key],
          score,
          previousScore: score,
        };
      });
      const { plan, tasks } = generatePlan(profile, skills, db.mockResults);
      persist({ ...db, user: profile, skills, plan, tasks });
    },
    [db, persist]
  );

  const startTask = useCallback(
    (taskId: string) => {
      if (!db) return;
      const tasks = db.tasks.map((t) => (t.id === taskId ? { ...t, status: 'in_progress' as const } : t));
      persist({ ...db, tasks });
    },
    [db, persist]
  );

  const skipTask = useCallback(
    (taskId: string) => {
      if (!db) return;
      const tasks = db.tasks.map((t) => (t.id === taskId ? { ...t, status: 'skipped' as const } : t));
      persist({ ...db, tasks });
    },
    [db, persist]
  );

  const completeTask = useCallback(
    (taskId: string, score?: number) => {
      if (!db) return;
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const tasks = db.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'done' as const, completedAt: new Date().toISOString() }
          : t
      );
      const delta = skillDeltaForTask(task.type);
      const skillState = db.skills[task.skill];
      const newScore = Math.min(100, Math.round((skillState?.score ?? 0) + delta));
      const skills = {
        ...db.skills,
        [task.skill]: {
          ...(skillState ?? { skill: task.skill, score: 0, previousScore: 0, lessonsCompleted: 0, practiceMinutes: 0 }),
          score: newScore,
          lessonsCompleted: (skillState?.lessonsCompleted ?? 0) + 1,
          practiceMinutes: (skillState?.practiceMinutes ?? 0) + task.durationMinutes,
          lastPracticedAt: new Date().toISOString(),
        },
      };
      const session = {
        id: uid('ses'),
        taskId,
        skill: task.skill,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: task.durationMinutes,
        source: task.title,
        score,
        completed: true,
      };
      persist({ ...db, tasks, skills, studySessions: [...db.studySessions, session] });
    },
    [db, persist]
  );

  const addTask = useCallback(
    (task: StudyTask) => {
      if (!db) return;
      persist({ ...db, tasks: [...db.tasks, task] });
    },
    [db, persist]
  );

  const updateTask = useCallback(
    (taskId: string, partial: Partial<StudyTask>) => {
      if (!db) return;
      const tasks = db.tasks.map((t) => (t.id === taskId ? { ...t, ...partial } : t));
      persist({ ...db, tasks });
    },
    [db, persist]
  );

  const removeTask = useCallback(
    (taskId: string) => {
      if (!db) return;
      persist({ ...db, tasks: db.tasks.filter((t) => t.id !== taskId) });
    },
    [db, persist]
  );

  const logStudySession = useCallback(
    (input: { skill: SkillKey; minutes: number; score?: number; source?: string; taskId?: string }) => {
      if (!db) return;
      const session = {
        id: uid('ses'),
        taskId: input.taskId,
        skill: input.skill,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: input.minutes,
        source: input.source,
        score: input.score,
        completed: true,
      };
      const skillState = db.skills[input.skill];
      const delta = input.score !== undefined ? Math.max(0, Math.round((input.score - (skillState?.score ?? 0)) * 0.3)) : 2;
      const newScore = Math.min(100, Math.round((skillState?.score ?? 0) + delta));
      const skills = {
        ...db.skills,
        [input.skill]: {
          ...(skillState ?? { skill: input.skill, score: 0, previousScore: 0, lessonsCompleted: 0, practiceMinutes: 0 }),
          score: newScore,
          lessonsCompleted: (skillState?.lessonsCompleted ?? 0) + 1,
          practiceMinutes: (skillState?.practiceMinutes ?? 0) + input.minutes,
          lastPracticedAt: new Date().toISOString(),
        },
      };
      persist({ ...db, skills, studySessions: [...db.studySessions, session] });
    },
    [db, persist]
  );

  const reviewWord = useCallback(
    (wordId: string, rating: ReviewRating) => {
      if (!db) return;
      const vocabulary = db.vocabulary.map((w) => (w.id === wordId ? applySrsReview(w, rating) : w));
      const dueCount = vocabulary.filter((w) => !w.mastered && new Date(w.dueAt) <= new Date()).length;
      const score = Math.round((vocabulary.reduce((a, w) => a + w.familiarity, 0) / vocabulary.length) * 100);
      persist({
        ...db,
        vocabulary,
        skills: { ...db.skills, vocabulary: { ...db.skills.vocabulary, score: Math.max(db.skills.vocabulary.score, score) } },
      });
      void dueCount;
    },
    [db, persist]
  );

  const addNewWord = useCallback(() => {
    if (!db) return;
    const newWord = {
      id: uid('voc'),
      german: '',
      article: 'die',
      english: '',
      example: '',
      category: 'Personal',
      difficulty: 1 as const,
      familiarity: 0,
      ease: 2.5,
      interval: 0,
      reviews: 0,
      dueAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      mastered: false,
    };
    persist({ ...db, vocabulary: [newWord, ...db.vocabulary] });
  }, [db, persist]);

  const submitMockResult = useCallback(
    (result: MockExamResult) => {
      if (!db) return;
      const results = [...db.mockResults, result];
      const skills = { ...db.skills };
      for (const section of result.sectionScores) {
        const skill = section.name === 'Hören' ? 'listening' : section.name === 'Lesen' ? 'reading' : section.name === 'Schreiben' ? 'writing' : section.name === 'Sprechen' ? 'speaking' : 'grammar';
        const pct = section.maxScore > 0 ? Math.round((section.score / section.maxScore) * 100) : 0;
        const current = skills[skill]?.score ?? 0;
        skills[skill] = {
          ...(skills[skill] ?? { skill, score: 0, previousScore: 0, lessonsCompleted: 0, practiceMinutes: 0 }),
          score: Math.round(current * 0.6 + pct * 0.4),
          previousScore: current,
          practiceMinutes: (skills[skill]?.practiceMinutes ?? 0) + result.durationMinutes,
          lastPracticedAt: new Date().toISOString(),
        };
      }
      persist({ ...db, mockResults: results, skills, mistakes: [...db.mistakes, ...result.mistakes] });
    },
    [db, persist]
  );

  const addMistake = useCallback(
    (mistake: Omit<Mistake, 'id' | 'createdAt' | 'reviewed' | 'timesCorrect'>) => {
      if (!db) return;
      const full: Mistake = {
        ...mistake,
        id: uid('mis'),
        createdAt: new Date().toISOString(),
        reviewed: false,
        timesCorrect: 0,
      };
      persist({ ...db, mistakes: [full, ...db.mistakes] });
    },
    [db, persist]
  );

  const markMistakeReviewed = useCallback(
    (id: string) => {
      if (!db) return;
      const mistakes = db.mistakes.map((m) =>
        m.id === id ? { ...m, reviewed: true, timesCorrect: m.timesCorrect + 1 } : m
      );
      persist({ ...db, mistakes });
    },
    [db, persist]
  );

  const deleteMistake = useCallback(
    (id: string) => {
      if (!db) return;
      persist({ ...db, mistakes: db.mistakes.filter((m) => m.id !== id) });
    },
    [db, persist]
  );

  const generateStudyPlan = useCallback(() => {
    if (!db || !db.user) return;
    const { plan, tasks } = generatePlan(db.user, db.skills, db.mockResults);
    persist({ ...db, plan, tasks });
  }, [db, persist]);

  const adaptStudyPlan = useCallback(() => {
    if (!db || !db.plan) return;
    const adapted = adaptPlan(db, 15);
    persist({ ...db, plan: adapted.plan, tasks: adapted.tasks });
  }, [db, persist]);

  const saveSpeakingSession = useCallback(
    (session: SpeakingSession) => {
      if (!db) return;
      const skills = { ...db.skills, speaking: { ...db.skills.speaking, lessonsCompleted: db.skills.speaking.lessonsCompleted + 1, practiceMinutes: db.skills.speaking.practiceMinutes + session.durationMinutes, lastPracticedAt: new Date().toISOString() } };
      persist({ ...db, speakingSessions: [session, ...db.speakingSessions], skills, studySessions: [...db.studySessions, { id: uid('ses'), skill: 'speaking', startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationMinutes: session.durationMinutes, source: 'Speaking session', score: session.feedback.fluency, completed: true }] });
    },
    [db, persist]
  );

  const upsertApplication = useCallback(
    (app: JobApplication) => {
      if (!db) return;
      const exists = db.applications.some((a) => a.id === app.id);
      const applications = exists
        ? db.applications.map((a) => (a.id === app.id ? app : a))
        : [app, ...db.applications];
      persist({ ...db, applications });
    },
    [db, persist]
  );

  const deleteApplication = useCallback(
    (id: string) => {
      if (!db) return;
      persist({ ...db, applications: db.applications.filter((a) => a.id !== id) });
    },
    [db, persist]
  );

  const upsertProject = useCallback(
    (project: Project) => {
      if (!db) return;
      const exists = db.projects.some((p) => p.id === project.id);
      const projects = exists
        ? db.projects.map((p) => (p.id === project.id ? project : p))
        : [project, ...db.projects];
      persist({ ...db, projects });
    },
    [db, persist]
  );

  const deleteProject = useCallback(
    (id: string) => {
      if (!db) return;
      persist({ ...db, projects: db.projects.filter((p) => p.id !== id) });
    },
    [db, persist]
  );

  const updateTechSkill = useCallback(
    (id: string, partial: Partial<TechnicalSkill>) => {
      if (!db) return;
      const techSkills = db.techSkills.map((s) => (s.id === id ? { ...s, ...partial } : s));
      persist({ ...db, techSkills });
    },
    [db, persist]
  );

  const updateSettings = useCallback(
    (partial: Partial<Database['settings']>) => {
      if (!db) return;
      persist({ ...db, settings: { ...db.settings, ...partial } });
    },
    [db, persist]
  );

  const updateDocument = useCallback(
    (id: string, partial: Partial<Database['documents'][number]>) => {
      if (!db) return;
      const documents = db.documents.map((d) =>
        d.id === id
          ? { ...d, ...partial, updatedAt: new Date().toISOString() }
          : d
      );
      persist({ ...db, documents });
    },
    [db, persist]
  );

  const resetAll = useCallback(() => {
    const fresh = createInitialDatabase();
    if (authed) {
      void clearStudyStateServer();
    }
    persist(fresh);
    router.push('/');
  }, [authed, persist, router]);

  const value = useMemo<AppStore>(
    () => ({
      db,
      updateUser,
      completeOnboarding,
      completeTask,
      startTask,
      skipTask,
      addTask,
      updateTask,
      removeTask,
      logStudySession,
      reviewWord,
      addNewWord,
      submitMockResult,
      addMistake,
      markMistakeReviewed,
      deleteMistake,
      generateStudyPlan,
      adaptStudyPlan,
      saveSpeakingSession,
      upsertApplication,
      deleteApplication,
      upsertProject,
      deleteProject,
      updateTechSkill,
      updateDocument,
      updateSettings,
      resetAll,
    }),
    [db, updateUser, completeOnboarding, completeTask, startTask, skipTask, addTask, updateTask, removeTask, logStudySession, reviewWord, addNewWord, submitMockResult, addMistake, markMistakeReviewed, deleteMistake, generateStudyPlan, adaptStudyPlan, saveSpeakingSession, upsertApplication, deleteApplication, upsertProject, deleteProject, updateTechSkill, updateDocument, updateSettings, resetAll]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
