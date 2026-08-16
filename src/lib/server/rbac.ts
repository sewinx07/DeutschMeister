import type { Role } from '@/generated/prisma/enums';

export const PERMISSIONS = [
  'org.view',
  'org.manage',
  'settings.manage',
  'member.view',
  'member.manage',
  'course.view',
  'course.manage',
  'class.view',
  'class.manage',
  'student.view',
  'student.manage',
  'teacher.view',
  'teacher.manage',
  'assignment.manage',
  'assessment.manage',
  'grade.manage',
  'attendance.manage',
  'announcement.manage',
  'curriculum.manage',
  'analytics.view',
  'ai.use',
  'ai.generate',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role -> permission matrix for Phase 1. Stored in code, not the database;
 * a DB-backed permission table can replace it in a later phase without
 * touching callers.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  PLATFORM_ADMIN: PERMISSIONS,
  ORGANIZATION_OWNER: [
    'org.view',
    'org.manage',
    'settings.manage',
    'member.view',
    'member.manage',
    'course.view',
    'course.manage',
    'class.view',
    'class.manage',
    'student.view',
    'student.manage',
    'teacher.view',
    'teacher.manage',
    'assignment.manage',
    'assessment.manage',
    'grade.manage',
    'attendance.manage',
    'announcement.manage',
    'curriculum.manage',
    'analytics.view',
    'ai.use',
    'ai.generate',
    'audit.view',
  ],
  ORGANIZATION_ADMIN: [
    'org.view',
    'member.view',
    'member.manage',
    'course.view',
    'course.manage',
    'class.view',
    'class.manage',
    'student.view',
    'student.manage',
    'teacher.view',
    'teacher.manage',
    'assignment.manage',
    'assessment.manage',
    'grade.manage',
    'attendance.manage',
    'announcement.manage',
    'curriculum.manage',
    'analytics.view',
    'ai.use',
    'ai.generate',
    'audit.view',
  ],
  TEACHER: [
    'org.view',
    'member.view',
    'course.view',
    'class.view',
    'student.view',
    'assignment.manage',
    'assessment.manage',
    'grade.manage',
    'attendance.manage',
    'announcement.manage',
    'analytics.view',
    'ai.use',
    'ai.generate',
  ],
  STUDENT: ['org.view', 'course.view', 'class.view', 'analytics.view', 'ai.use'],
  INDIVIDUAL_LEARNER: ['org.view', 'course.view', 'analytics.view', 'ai.use'],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Roster rule for classes: org-level `class.manage` (admins/owners) or the
 * class teacher managing their own group.
 */
export function canManageClass(role: Role, klassTeacherId: string | null, userId: string): boolean {
  return roleHasPermission(role, 'class.manage') || klassTeacherId === userId;
}

/**
 * Analytics audience: staff who can both see analytics and access student
 * data. Students and individual learners are excluded even though they hold
 * `analytics.view`.
 */
export function canViewAnalytics(role: Role): boolean {
  return roleHasPermission(role, 'analytics.view') && roleHasPermission(role, 'student.view');
}
