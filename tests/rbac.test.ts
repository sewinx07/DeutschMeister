import { describe, expect, it } from 'vitest';
import { Role } from '@/generated/prisma/enums';
import { PERMISSIONS, roleHasPermission, ROLE_PERMISSIONS } from '@/lib/server/rbac';

describe('RBAC permission matrix', () => {
  it('every permission is granted to at least one role', () => {
    const granted = new Set(ROLE_PERMISSIONS[Role.PLATFORM_ADMIN]);
    for (const p of PERMISSIONS) {
      expect(granted.has(p), `permission ${p} should be granted somewhere`).toBe(true);
    }
  });

  it('platform admin can do everything', () => {
    for (const p of PERMISSIONS) {
      expect(roleHasPermission(Role.PLATFORM_ADMIN, p)).toBe(true);
    }
  });

  it('owner can do everything except platform-only power', () => {
    for (const p of PERMISSIONS) {
      expect(roleHasPermission(Role.ORGANIZATION_OWNER, p), p).toBe(true);
    }
  });

  it('students can learn but not manage', () => {
    expect(roleHasPermission(Role.STUDENT, 'course.view')).toBe(true);
    expect(roleHasPermission(Role.STUDENT, 'ai.use')).toBe(true);
    expect(roleHasPermission(Role.STUDENT, 'course.manage')).toBe(false);
    expect(roleHasPermission(Role.STUDENT, 'member.manage')).toBe(false);
    expect(roleHasPermission(Role.STUDENT, 'audit.view')).toBe(false);
  });

  it('teachers cannot manage billing or org settings', () => {
    expect(roleHasPermission(Role.TEACHER, 'assignment.manage')).toBe(true);
    expect(roleHasPermission(Role.TEACHER, 'org.manage')).toBe(false);
    expect(roleHasPermission(Role.TEACHER, 'settings.manage')).toBe(false);
    expect(roleHasPermission(Role.TEACHER, 'member.manage')).toBe(false);
  });

  it('admins can manage members but not org billing', () => {
    expect(roleHasPermission(Role.ORGANIZATION_ADMIN, 'member.manage')).toBe(true);
    expect(roleHasPermission(Role.ORGANIZATION_ADMIN, 'org.manage')).toBe(false);
  });

  it('individual learners are students without a school', () => {
    expect(roleHasPermission(Role.INDIVIDUAL_LEARNER, 'ai.use')).toBe(true);
    expect(roleHasPermission(Role.INDIVIDUAL_LEARNER, 'course.manage')).toBe(false);
  });

  it('every role maps to a known permission subset', () => {
    for (const role of Object.values(Role)) {
      const set = new Set(ROLE_PERMISSIONS[role]);
      for (const p of set) {
        expect(PERMISSIONS, `unknown permission ${p}`).toContain(p);
      }
    }
  });
});
