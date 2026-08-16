'use server';

import { z } from 'zod';
import type { SkillKey, SkillState, StudyState } from '@/types';
import { prisma } from '@/lib/server/db';
import { ActionError, toActionError } from '@/lib/server/errors';
import { requireUser } from '@/lib/server/auth-helpers';
import { resolveCurrentOrg } from '@/lib/server/tenant';
import { getStudyState, syncStudyState, clearStudyState, SKILL_KEYS } from '@/lib/server/study';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function currentOrgId(userId: string): Promise<string> {
  const membership = await resolveCurrentOrg(userId);
  if (!membership) {
    throw new ActionError('FORBIDDEN', 'You do not have access to an organization.');
  }
  return membership.orgId;
}

/** Light structural validation so a malformed client payload cannot write garbage. */
function parseStudyState(input: unknown): StudyState {
  const profileSchema = z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      createdAt: z.string(),
      currentLevel: z.string(),
      targetLevel: z.string(),
      examType: z.string(),
      examDate: z.string(),
      dailyStudyMinutes: z.number().int().min(0).max(1000),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      targetAusbildung: z.string(),
      itField: z.string(),
      preferredRegions: z.array(z.string()),
      onboarded: z.boolean(),
      timezone: z.string().optional(),
    })
    .nullable();

  const skillSchema = z.object({
    skill: z.enum(SKILL_KEYS as [string, ...string[]]),
    score: z.number().int().min(0).max(100),
    previousScore: z.number().int().min(0).max(100),
    lessonsCompleted: z.number().int().min(0),
    practiceMinutes: z.number().int().min(0),
    lastPracticedAt: z.string().optional(),
  });

  const settingsSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']),
    sound: z.boolean(),
    examMode: z.boolean(),
    restDayEvery: z.number().int().min(1).max(30),
    notifications: z.boolean(),
  });

  const taskSchema = z.object({
    id: z.string(),
    date: z.string(),
    skill: z.string(),
    title: z.string(),
    description: z.string().optional(),
    durationMinutes: z.number().int().min(0),
    difficulty: z.number().int().min(1).max(3),
    status: z.string(),
    type: z.string(),
    sourceId: z.string().optional(),
    phaseId: z.string().optional(),
    completedAt: z.string().optional(),
    isRest: z.boolean().optional(),
    isPlaceholder: z.boolean().optional(),
  });

  const sessionSchema = z.object({
    id: z.string(),
    taskId: z.string().optional(),
    skill: z.string(),
    startedAt: z.string(),
    endedAt: z.string().optional(),
    durationMinutes: z.number().int().min(0),
    source: z.string().optional(),
    score: z.number().optional(),
    completed: z.boolean(),
  });

  const planSchema = z
    .object({ id: z.string(), phases: z.unknown(), adjustments: z.unknown() })
    .nullable();

  const schema = z.object({
    user: profileSchema,
    skills: z.record(z.string(), skillSchema),
    vocabulary: z.array(z.object({ id: z.string(), german: z.string() }).passthrough()),
    plan: planSchema,
    tasks: z.array(taskSchema),
    studySessions: z.array(sessionSchema),
    mockResults: z.array(z.object({ id: z.string() }).passthrough()),
    mistakes: z.array(z.object({ id: z.string(), category: z.string() }).passthrough()),
    achievements: z.array(z.object({ key: z.string() }).passthrough()),
    speakingSessions: z.array(z.object({ id: z.string() }).passthrough()),
    settings: settingsSchema,
  });

  const parsed = schema.parse(input);
  const skills = {} as StudyState['skills'];
  for (const key of SKILL_KEYS) {
    const skillKey = key as SkillKey;
    const value = (parsed.skills as Record<string, SkillState>)[key];
    skills[skillKey] = value ?? { skill: skillKey, score: 0, previousScore: 0, lessonsCompleted: 0, practiceMinutes: 0 };
  }
  return parsed as unknown as StudyState;
}

export async function loadStudyState(): Promise<ActionResult<StudyState>> {
  try {
    const user = await requireUser();
    const orgId = await currentOrgId(user.id);
    const state = await getStudyState(orgId, user.id);
    return { ok: true, data: state };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function saveStudyState(input: StudyState): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const orgId = await currentOrgId(user.id);
    const state = parseStudyState(input);
    await syncStudyState(orgId, user.id, state);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function clearStudyStateServer(): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const orgId = await currentOrgId(user.id);
    await clearStudyState(orgId, user.id);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}

export async function updateStudyProfileName(name: string): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const parsed = z
      .object({ name: z.string().min(1, 'Name is required').max(100) })
      .parse({ name });
    await prisma.user.update({ where: { id: user.id }, data: { name: parsed.name } });
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}
