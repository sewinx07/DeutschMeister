import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client';
import { MembershipStatus, Role } from '../src/generated/prisma/enums';
import { hashPassword } from '@better-auth/utils/password';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Run `npm run db:seed` with a valid .env');
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: databaseUrl }) });

// Shared demo password — documented in README, dev/demo only.
const DEMO_PASSWORD = 'Demo12345!';

const DEMO_ORG = {
  name: 'Lernio Demo Academy',
  slug: 'lernio-demo-academy',
  description: 'A demo school for exploring Lernio teams, roles and permissions.',
};

const PEOPLE = [
  { email: 'admin@lernio.app', name: 'Lernio Admin', role: Role.PLATFORM_ADMIN, orgRole: Role.ORGANIZATION_ADMIN },
  { email: 'owner@lernio.app', name: 'Mira Vogel', role: Role.INDIVIDUAL_LEARNER, orgRole: Role.ORGANIZATION_OWNER },
  { email: 'teacher@lernio.app', name: 'Jonas Weber', role: Role.INDIVIDUAL_LEARNER, orgRole: Role.TEACHER },
  { email: 'anna@lernio.app', name: 'Anna Schmidt', role: Role.INDIVIDUAL_LEARNER, orgRole: Role.STUDENT },
  { email: 'luca@lernio.app', name: 'Luca Rossi', role: Role.INDIVIDUAL_LEARNER, orgRole: Role.STUDENT },
];

async function main() {
  console.log('Seeding Lernio demo workspace…');

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG.slug },
    update: { name: DEMO_ORG.name, description: DEMO_ORG.description },
    create: DEMO_ORG,
  });

  for (const person of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        isPlatformAdmin: person.role === Role.PLATFORM_ADMIN,
        currentOrganizationId: org.id,
      },
      create: {
        email: person.email,
        name: person.name,
        emailVerified: true,
        isPlatformAdmin: person.role === Role.PLATFORM_ADMIN,
        currentOrganizationId: org.id,
        accounts: {
          create: {
            providerId: 'credential',
            accountId: person.email,
            password: passwordHash,
          },
        },
      },
    });

    await prisma.organizationMember.upsert({
      where: { orgId_userId: { orgId: org.id, userId: user.id } },
      update: { role: person.orgRole, status: MembershipStatus.ACTIVE },
      create: {
        orgId: org.id,
        userId: user.id,
        role: person.orgRole,
        status: MembershipStatus.ACTIVE,
      },
    });

    console.log(`  ${person.email} → ${person.orgRole}`);
  }

  console.log('Seeding demo courses…');

  const byEmail = (email: string) => prisma.user.findUniqueOrThrow({ where: { email } });

  const germanCourse = await seedCourse({
    title: 'German A1 · Foundations',
    subject: 'german',
    level: 'A1',
    description: 'First steps in German: introductions, everyday phrases and basic grammar.',
    topics: [
      {
        title: 'Introductions & greetings',
        description: 'Say hello, introduce yourself and ask simple questions.',
        lessons: [
          { title: 'Vocabulary: formal greetings', kind: 'vocabulary', minutes: 30 },
          { title: 'Listening: meeting new people', kind: 'listening', minutes: 25 },
          { title: 'Grammar: sein & haben in the present', kind: 'grammar', minutes: 40 },
        ],
      },
      {
        title: 'Everyday phrases',
        description: 'Survive day-to-day situations in German.',
        lessons: [
          { title: 'Reading: a café menu', kind: 'reading', minutes: 20 },
          { title: 'Speaking: ordering coffee', kind: 'speaking', minutes: 35 },
        ],
      },
    ],
  });

  await seedCourse({
    title: 'English B1 · Communication Skills',
    subject: 'english',
    level: 'B1',
    description: 'Everyday conversation, writing emails and giving your opinion.',
    topics: [
      {
        title: 'Small talk',
        lessons: [
          { title: 'Vocabulary: weather and weekends', kind: 'vocabulary', minutes: 25 },
          { title: 'Speaking: interview practice', kind: 'speaking', minutes: 40 },
        ],
      },
    ],
  });

  const teacher = await byEmail('teacher@lernio.app');
  const anna = await byEmail('anna@lernio.app');
  const luca = await byEmail('luca@lernio.app');

  const existingClass = await prisma.class.findFirst({
    where: { orgId: org.id, name: 'German A1 · Morning group' },
  });
  const morningGroup = existingClass ?? (await prisma.class.create({
    data: {
      orgId: org.id,
      courseId: germanCourse.id,
      teacherId: teacher.id,
      name: 'German A1 · Morning group',
      description: 'Weekday mornings, 60 minutes.',
    },
  }));

  for (const student of [anna, luca]) {
    const exists = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId: morningGroup.id, studentId: student.id } },
    });
    if (!exists) {
      await prisma.classEnrollment.create({ data: { classId: morningGroup.id, studentId: student.id } });
    }
  }

  console.log('  German A1 · Foundations (published, 2 topics, 5 lessons)');
  console.log('  English B1 · Communication Skills (published, 1 topic, 2 lessons)');
  console.log(`  Class "German A1 · Morning group" — teacher: ${teacher.name}, students: Anna, Luca`);

  console.log('Seed complete.');
  console.log(`Demo password for every account above: ${DEMO_PASSWORD}`);
}

async function seedCourse(input: {
  title: string;
  subject: string;
  level?: string;
  description?: string;
  topics: { title: string; description?: string; lessons: { title: string; kind: string; minutes: number }[] }[];
}) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { slug: DEMO_ORG.slug } });
  const existing = await prisma.course.findFirst({ where: { orgId: org.id, title: input.title } });
  if (existing) return existing;

  return prisma.course.create({
    data: {
      orgId: org.id,
      title: input.title,
      subject: input.subject,
      level: input.level ?? null,
      description: input.description ?? null,
      published: true,
      topics: {
        create: input.topics.map((t, ti) => ({
          title: t.title,
          description: t.description ?? null,
          order: ti,
          lessons: {
            create: t.lessons.map((l, li) => ({
              title: l.title,
              kind: l.kind,
              minutes: l.minutes,
              order: li,
            })),
          },
        })),
      },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
