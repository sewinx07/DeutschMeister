import { prisma } from '@/lib/server/db';
import { getStudySummary } from '@/lib/server/study';
import type { SkillKey, StudySummary } from '@/types';

const SKILL_ORDER: SkillKey[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];

export interface ClassAnalytics {
  classId: string;
  className: string;
  courseTitle: string;
  subject: string;
  teacherName: string | null;
  studentsCount: number;
  studentsWithData: number;
  avgSkill: number | null;
  tasksDone: number;
  tasksTotal: number;
  minutesLast7d: number;
  vocabularyMastered: number;
  vocabularyTotal: number;
  mockAvgPercent: number | null;
  openMistakes: number;
  atRiskCount: number;
}

export interface AtRiskStudent {
  classId: string;
  className: string;
  student: { id: string; name: string; email: string };
  avgSkill: number | null;
  tasksDone: number;
  tasksTotal: number;
  daysInactive: number | null;
  reason: string;
}

export interface OrgAnalytics {
  classes: ClassAnalytics[];
  totals: {
    classes: number;
    students: number;
    studentsWithData: number;
    activeLast7d: number;
    avgSkill: number | null;
    tasksDone: number;
    tasksTotal: number;
    minutesLast7d: number;
    atRisk: number;
  };
  atRiskStudents: AtRiskStudent[];
}

/**
 * Average over skills the learner has actually practiced (score > 0). Skills
 * that were never touched are excluded so an unpracticed skill is not treated
 * as a failing grade.
 */
function skillAvg(summary: StudySummary): number | null {
  const values = SKILL_ORDER.map((k) => summary.skills[k]?.score).filter(
    (v): v is number => typeof v === 'number' && v > 0,
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function inactivityDays(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/**
 * At-risk rule (first match wins): no study data at all, a skill average below
 * 50%, less than half of planned tasks completed, or no activity in 7+ days.
 */
function atRiskReason(summary: StudySummary | null): string | null {
  if (!summary) return 'No study data yet';
  if (summary.tasksTotal === 0 && summary.lastActiveAt === null) return 'No study data yet';
  const avg = skillAvg(summary);
  if (avg !== null && avg < 50) return 'Skill average below 50%';
  if (summary.tasksTotal > 0 && summary.tasksDone / summary.tasksTotal < 0.5) return 'Less than half of tasks completed';
  const days = inactivityDays(summary.lastActiveAt);
  if (days !== null && days >= 7) return 'Inactive for 7+ days';
  return null;
}

/**
 * Read-only org-wide analytics across all classes: per-class aggregates plus
 * an org rollup and a list of at-risk students. Org-scoped by `orgId`; never
 * creates or writes rows.
 */
export async function loadOrgAnalytics(orgId: string): Promise<OrgAnalytics> {
  const classes = await prisma.class.findMany({
    where: { orgId },
    include: {
      course: { select: { title: true, subject: true } },
      teacher: { select: { name: true } },
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { enrolledAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const classList: ClassAnalytics[] = [];
  const atRiskStudents: AtRiskStudent[] = [];
  let activeLast7d = 0;

  for (const klass of classes) {
    const summaries = await Promise.all(
      klass.enrollments.map(async (e) => ({
        student: e.student,
        summary: await getStudySummary(orgId, e.student.id),
      })),
    );

    const withData = summaries.filter((s) => s.summary !== null);
    activeLast7d += withData.filter((s) => inactivityDays(s.summary!.lastActiveAt) !== null && inactivityDays(s.summary!.lastActiveAt)! < 7).length;
    const avgValues = withData
      .map((s) => skillAvg(s.summary!))
      .filter((v): v is number => v !== null);
    const tasksDone = withData.reduce((a, s) => a + s.summary!.tasksDone, 0);
    const tasksTotal = withData.reduce((a, s) => a + s.summary!.tasksTotal, 0);
    const minutesLast7d = withData.reduce((a, s) => a + s.summary!.minutesLast7d, 0);
    const vocabularyMastered = withData.reduce((a, s) => a + s.summary!.vocabularyMastered, 0);
    const vocabularyTotal = withData.reduce((a, s) => a + s.summary!.vocabularyTotal, 0);
    const mockPercents = withData
      .map((s) => s.summary!.mockAvgPercent)
      .filter((v): v is number => v !== null);
    const openMistakes = withData.reduce((a, s) => a + s.summary!.openMistakes, 0);

    const classAtRisk = summaries
      .map(({ student, summary }) => {
        const reason = atRiskReason(summary);
        if (!reason) return null;
        return {
          classId: klass.id,
          className: klass.name,
          student,
          avgSkill: summary ? skillAvg(summary) : null,
          tasksDone: summary?.tasksDone ?? 0,
          tasksTotal: summary?.tasksTotal ?? 0,
          daysInactive: inactivityDays(summary?.lastActiveAt ?? null),
          reason,
        } satisfies AtRiskStudent;
      })
      .filter((s): s is AtRiskStudent => s !== null);

    classList.push({
      classId: klass.id,
      className: klass.name,
      courseTitle: klass.course.title,
      subject: klass.course.subject,
      teacherName: klass.teacher?.name ?? null,
      studentsCount: summaries.length,
      studentsWithData: withData.length,
      avgSkill: avgValues.length ? Math.round(avgValues.reduce((a, b) => a + b, 0) / avgValues.length) : null,
      tasksDone,
      tasksTotal,
      minutesLast7d,
      vocabularyMastered,
      vocabularyTotal,
      mockAvgPercent: mockPercents.length ? Math.round(mockPercents.reduce((a, b) => a + b, 0) / mockPercents.length) : null,
      openMistakes,
      atRiskCount: classAtRisk.length,
    });
    atRiskStudents.push(...classAtRisk);
  }

  const allAvg = classList.map((c) => c.avgSkill).filter((v): v is number => v !== null);
  return {
    classes: classList,
    totals: {
      classes: classes.length,
      students: classList.reduce((a, c) => a + c.studentsCount, 0),
      studentsWithData: classList.reduce((a, c) => a + c.studentsWithData, 0),
      activeLast7d,
      avgSkill: allAvg.length ? Math.round(allAvg.reduce((a, b) => a + b, 0) / allAvg.length) : null,
      tasksDone: classList.reduce((a, c) => a + c.tasksDone, 0),
      tasksTotal: classList.reduce((a, c) => a + c.tasksTotal, 0),
      minutesLast7d: classList.reduce((a, c) => a + c.minutesLast7d, 0),
      atRisk: atRiskStudents.length,
    },
    atRiskStudents,
  };
}
