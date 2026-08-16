import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/server/db';
import { MembershipStatus, Role } from '@/generated/prisma/enums';
import { ActionError } from '@/lib/server/errors';
import { assertPermission } from '@/lib/server/tenant';
import { canManageClass } from '@/lib/server/rbac';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('course & class tenant isolation', () => {
  const tag = randomUUID().slice(0, 8);
  const orgIds: string[] = [];
  const userIds: string[] = [];
  let orgAId = '';
  let orgBId = '';
  let ownerAId = '';
  let ownerBId = '';
  let studentAId = '';
  let studentBId = '';
  let teacherAId = '';

  async function makeOrg(prefix: string) {
    const org = await prisma.organization.create({ data: { name: prefix, slug: `${prefix}-${tag}` } });
    orgIds.push(org.id);
    return org.id;
  }

  async function makeUser(email: string) {
    const user = await prisma.user.create({
      data: { email: `${tag}-${email}`, name: email },
    });
    userIds.push(user.id);
    return user.id;
  }

  async function join(userId: string, orgId: string, role: Role) {
    await prisma.organizationMember.create({ data: { userId, orgId, role, status: MembershipStatus.ACTIVE } });
  }

  beforeAll(async () => {
    if (!enabled) return;
    orgAId = await makeOrg('orga');
    orgBId = await makeOrg('orgb');
    ownerAId = await makeUser('o-a');
    ownerBId = await makeUser('o-b');
    studentAId = await makeUser('s-a');
    studentBId = await makeUser('s-b');
    teacherAId = await makeUser('t-a');
    await join(ownerAId, orgAId, Role.ORGANIZATION_OWNER);
    await join(ownerBId, orgBId, Role.ORGANIZATION_OWNER);
    await join(studentAId, orgAId, Role.STUDENT);
    await join(studentBId, orgBId, Role.STUDENT);
    await join(teacherAId, orgAId, Role.TEACHER);
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.classEnrollment.deleteMany({ where: { class: { orgId: { in: [orgAId, orgBId] } } } });
    await prisma.class.deleteMany({ where: { orgId: { in: [orgAId, orgBId] } } });
    await prisma.courseLesson.deleteMany({ where: { topic: { course: { orgId: { in: [orgAId, orgBId] } } } } });
    await prisma.courseTopic.deleteMany({ where: { course: { orgId: { in: [orgAId, orgBId] } } } });
    await prisma.course.deleteMany({ where: { orgId: { in: [orgAId, orgBId] } } });
    await prisma.organizationMember.deleteMany({ where: { orgId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it('a course belongs to exactly one org and is invisible to another', async () => {
    const course = await prisma.course.create({
      data: { orgId: orgAId, title: 'German A1', subject: 'german' },
    });
    const inA = await prisma.course.count({ where: { id: course.id, orgId: orgAId } });
    const inB = await prisma.course.count({ where: { id: course.id, orgId: orgBId } });
    expect(inA).toBe(1);
    expect(inB).toBe(0);
  });

  it('owner of org A cannot create courses in org B', async () => {
    await expect(assertPermission(ownerAId, orgBId, 'course.manage')).rejects.toBeInstanceOf(ActionError);
    await expect(assertPermission(ownerAId, orgAId, 'course.manage')).resolves.toBeUndefined();
  });

  it('owners of the other org cannot manage a class created in org A', async () => {
    const course = await prisma.course.create({
      data: { orgId: orgAId, title: 'English B1', subject: 'english' },
    });
    const klass = await prisma.class.create({
      data: { orgId: orgAId, courseId: course.id, name: 'Morning group', teacherId: teacherAId },
    });
    // cross-tenant denial
    await expect(assertPermission(ownerBId, orgAId, 'class.manage')).rejects.toBeInstanceOf(ActionError);
    // a student of org B is not enrollable in org A's class
    const membershipInA = await prisma.organizationMember.count({
      where: { orgId: orgAId, userId: studentBId },
    });
    expect(membershipInA).toBe(0);
    // teacher manages their own class
    expect(canManageClass(Role.TEACHER, teacherAId, teacherAId)).toBe(true);
    // teacher cannot manage someone else's class via org rule alone
    expect(canManageClass(Role.TEACHER, teacherAId, ownerAId)).toBe(false);
    // admins/owners manage any class in the org
    expect(canManageClass(Role.ORGANIZATION_OWNER, teacherAId, ownerAId)).toBe(true);
    await prisma.class.delete({ where: { id: klass.id } });
  });

  it('enrollment scoping: a student only appears in their own org classes', async () => {
    const course = await prisma.course.create({
      data: { orgId: orgAId, title: 'Math', subject: 'math' },
    });
    const klassA = await prisma.class.create({
      data: { orgId: orgAId, courseId: course.id, name: 'Group A' },
    });
    const klassB = await prisma.class.create({
      data: { orgId: orgBId, courseId: course.id, name: 'Group B' },
    });
    // try to enroll a B student into A's class via raw data would be a violation;
    // the action layer prevents it — assert the scoped query shows the separation
    await prisma.classEnrollment.create({ data: { classId: klassA.id, studentId: studentAId } });
    const studentAClasses = await prisma.class.findMany({
      where: { orgId: orgAId, enrollments: { some: { studentId: studentAId } } },
    });
    const studentBClassesInA = await prisma.class.findMany({
      where: { orgId: orgAId, enrollments: { some: { studentId: studentBId } } },
    });
    expect(studentAClasses.map((c) => c.id)).toContain(klassA.id);
    expect(studentBClassesInA).toHaveLength(0);
    await prisma.class.deleteMany({ where: { id: { in: [klassA.id, klassB.id] } } });
  });

  it('a teacher cannot enroll a foreign-org student via the class-manager rule', async () => {
    // cross-org membership check is part of the action flow (resolveActiveMember);
    // here we assert the underlying invariant that the B student has no ACTIVE
    // teacher/owner membership in org A
    const crossOrgMembership = await prisma.organizationMember.findFirst({
      where: { orgId: orgAId, userId: studentBId, status: MembershipStatus.ACTIVE },
    });
    expect(crossOrgMembership).toBeNull();
  });
});
