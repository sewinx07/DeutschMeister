# DeutschMeister

A personal command center for passing your German exam and landing an IT-Ausbildung in Germany. Adaptive study plans, spaced-repetition vocabulary, grammar drills, mock exams, an AI coach, and a full career toolkit — all in one app.

> **Lernio platform (in progress).** The app is being rebuilt as **Lernio** — a multi-tenant learning SaaS for individual learners, teachers and schools. Phase 1 (database, authentication, organizations, roles & permissions, tenant isolation, audit log), Phase 2 (courses, classes and the student/teacher UI), Phase 3 (study engine persistence — SRS vocabulary, study plan, progress and mistakes in Postgres), Phase 4 (lesson player — taking plan tasks as guided, progress-writing lessons), Phase 5 (teacher progress dashboard — per-student study progress in every class), Phase 6 (lesson content authoring — edit, reorder and delete topics & lessons, including each lesson's JSON content) and Phase 7 (course lesson viewer — a dedicated page that renders a course lesson's authored content, with prev/next navigation through the course) are implemented and tested; the German exam app remains fully functional as the flagship demo.

## Platform foundation (Phase 1)

- **Database** — PostgreSQL on **Neon** with **Prisma 7** (driver adapter, generated client in `src/generated/prisma`).
- **Authentication** — **Better Auth** (email + password) with sessions stored in Postgres. Custom sign-in / sign-up pages and an `/account` workspace.
- **Organizations & RBAC** — users join any number of organizations with a role (`PLATFORM_ADMIN`, `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`, `TEACHER`, `STUDENT`, `INDIVIDUAL_LEARNER`). The permission matrix lives in `src/lib/server/rbac.ts`; every server action verifies access via `src/lib/server/tenant.ts`.
- **Tenant isolation** — org id is always resolved server-side from the session/membership, never from client input. Enforced and covered by integration tests.
- **Audit log** — append-only record of org-sensitive actions.
- **Demo workspace** — `prisma/seed.ts` seeds the "Lernio Demo Academy" org with an admin, owner, teacher and students (password `Demo12345!` for every account).

## Courses & classes (Phase 2)

- **Courses** — org-scoped courses with a subject (`german`, `english`, `math`, …) and optional CEFR level, composed of ordered **topics** and **lessons** (title, kind, minutes, JSON content). Owners/admins create and publish; everyone sees published courses, managers see drafts too.
- **Classes & rosters** — a class ties a course to a teacher and enrolled students. Owners/admins manage any class; a teacher manages their **own** class's roster (rule in `src/lib/server/rbac.ts`); students see only the classes they are enrolled in.
- **UI** — authenticated area at `/app` (`/app/courses`, `/app/courses/[id]`, `/app/classes`, `/app/classes/[id]`), protected by the proxy. Server actions live in `src/lib/server/actions/{courses,classes}.ts` and are validated with Zod + audited.
- **Tenant isolation** — courses/classes/enrollments are scoped by org id server-side and covered by integration tests in `tests/courses.test.ts`.

## Study engine persistence (Phase 3)

- **What's persisted** — for every signed-in learner, per organization, the full study slice now lives in Postgres: profile (levels, exam date, goal), the six-skill progress, spaced-repetition vocabulary (with SRS fields: familiarity, ease, interval, due date, mastery), the adaptive study plan + generated tasks, study sessions, mock exam results, the mistake bank, achievements, speaking sessions, and app settings. Catalog content (grammar/comprehension/prompts/mock templates) stays deterministic client-side; career data (goal, tech skills, projects, applications, documents) stays on-device in `localStorage`.
- **Storage layout** — a `LearnerProfile` row per `(organization, user)`; vocabulary is keyed by `german` (`@@unique(learnerId, german)`), tasks/sessions/mistakes by id, so progress follows the learner across devices. All rows cascade-delete with the profile.
- **Service** — `src/lib/server/study.ts` (`getStudyState`, `syncStudyState`, `clearStudyState`) loads and writes the whole slice in one transactional pass, skipping rows whose canonical JSON is unchanged (fast steady-state syncs, safe first-login imports). Server actions in `src/lib/server/actions/study.ts` validate payloads with Zod and resolve the org server-side.
- **Client wiring** — `src/lib/store/app-store.tsx`: authenticated users load from the server and merge with catalog + local career data; a first login with existing local progress imports it to the server (no progress lost); saves are queued and pushed to the server while a `localStorage` backup is always kept. Anonymous users keep working fully offline as before.
- **Coverage** — integration tests in `tests/study.test.ts`: round-trip fidelity, idempotent syncs, tenant isolation, and full reset.

## Lesson player (Phase 4)

- **Plan → lesson**: every content task on the plan page opens a real lesson at `/lessons/[taskId]` via its **Start** button instead of a bare "complete". Grammar, reading, listening, writing, speaking, mock exams, vocabulary/review, mistakes and rest days each get a purpose-built player.
- **Deterministic content ids** — catalog content now has stable, slug-based ids (`gram-…`, `gx-…`, `listen-…`, `read-…`, `write-…`, `speak-…`, `mock-…`) so generated tasks can reference a concrete grammar topic, comprehension item, prompt or mock template.
- **Task → content linking** — `generatePlan`/`generateTasksForDay` accept the catalog and stamp every content-backed task with a `sourceId` via a deterministic picker, so regenerations and weekly adaptations keep mapping to the same content. Tasks created before this change fall back to a type-based pick (still fully playable).
- **Progress written on the fly** — finishing a lesson calls `completeTask` (task done, skill delta, study session), and the grammar/writing/speaking players also push mistakes into the mistake bank for later review. Mock exams keep scoring through the existing runner.
- **Shared components** — the grammar exercises moved into a reusable `GrammarDetail` component (scoring + mistake capture) shared by the grammar page and the player; the existing `ComprehensionExercise` is reused for reading/listening.
- **Coverage** — unit tests in `tests/plan.test.ts`: content tasks resolve to real catalog ids, mock exam tasks reference real templates, regenerations are deterministic, and absent catalogs leave `sourceId` unset.

## Teacher progress dashboard (Phase 5)

- **Per-student study progress** — a class manager or the class teacher opens **View progress** from the class page (`/app/classes/[id]/progress`) and sees every enrolled student: overall skill average, current → target level, exam date countdown, active plan phase, tasks done/total, study minutes, last-week activity, vocabulary mastered, mock exam results, open mistakes and recent mistakes.
- **Read-only by construction** — `getStudySummary` in `src/lib/server/study.ts` never creates rows (unlike `getStudyState`, which lazily provisions a learner). A student with no study data simply shows "no data".
- **Tenant-scoped** — `loadClassProgress` in `src/lib/server/class-progress.ts` resolves the class strictly by `(orgId, classId)` and lists only enrolled students; the page gates on the same manager/teacher rule the class page uses.
- **UI** — `ClassProgressPanel` renders a collapsible roster with skill bars, weekly activity, vocabulary/mastery, mock stats and recent mistakes; the class page links to it for managers only.
- **Coverage** — integration tests in `tests/class-progress.test.ts`: summary aggregation over persisted state, no profile → `null` with zero rows created, and org-scoped class reads.

## Lesson content authoring (Phase 6)

- **Edit, reorder, delete** — course managers can rename a topic, rewrite its description, move topics and lessons up/down, and delete lessons or whole topics (topic deletion cascades to its lessons, with a confirm step and the removed lesson count in the audit log).
- **Lesson content** — each lesson's `content` JSON is editable in-app through a validated JSON editor with a live read-only preview of common content shapes, so teachers can author lesson material without touching the database.
- **Actions** — `updateTopic`, `deleteTopic`, `moveTopic`, `updateLesson`, `deleteLesson`, `moveLesson` in `src/lib/server/actions/courses.ts`, all permission-checked with `course.manage`, Zod-validated, audited and revalidated; `createTopic`/`createLesson` now audit as well.
- **UI** — `TopicEditor` and `LessonEditor` controls on the course page (visible only to managers); `LessonContentEditor` is the shared JSON editor/preview used by lesson editing.
- **Coverage** — integration tests in `tests/course-authoring.test.ts` run the real actions against the test database (with `requireUser`/audit/`revalidatePath` mocked): topic/lesson updates, order swaps in both directions, JSON content round-trip and clearing, cross-org denial, and topic deletion cascade.

## Course lesson viewer (Phase 7)

- **Read lessons end-to-end** — every lesson on a course page links to `/app/courses/[id]/lessons/[lessonId]`, which renders the authored `content` JSON as structured HTML (heading/body, prompt callout, question/choices/answer, item lists, generic fallback), plus kind and duration badges.
- **Linear navigation** — previous/next buttons walk through the whole course across topic boundaries (`loadCourseLesson` in `src/lib/server/course-lessons.ts` flattens topics in order).
- **Same visibility rules as courses** — org-scoped and 404 for anything outside the org; unpublished courses are viewable only by managers.
- **Shared renderer** — `LessonContent` in `src/components/app/lesson-content.tsx` is directive-free so the same renderer powers the viewer page (server) and the authoring editor's live preview (client).
- **Coverage** — integration tests in `tests/course-lesson-view.test.ts`: content/topic/sibling data, cross-topic navigation, cross-org denial, unpublished-course gate for non-managers, and missing lessons.

## Features

- **Onboarding wizard** — set your current and target CEFR level, exam type and date, daily study time, and IT-Ausbildung goal.
- **Adaptive study plan** — phase-by-phase plan generated from your exam date, rebalanced weekly toward your weakest skills, with rest days built in.
- **All six skills** — vocabulary (SRS flashcards with German text-to-speech), grammar exercises, listening, reading, writing (AI feedback) and speaking (AI feedback).
- **Mock exams & readiness** — timed mock exams, instant scoring, mistake capture, and a live exam-readiness score.
- **Mistake bank** — every wrong answer is explained and scheduled for review.
- **AI coach** — chat about your plan, vocabulary or grammar. Fully functional offline with a rule-based engine; set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to enable the online coach.
- **Career toolkit** — Ausbildung roadmap, application tracker, IT skills & portfolio builder, and document preparation checklists.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (radix) — dark/light theme
- **Recharts** for progress analytics
- **Zod** for AI output validation and server-action input validation
- **Prisma 7** + **Neon** (Postgres) — driver adapter + generated client
- **Better Auth** — email/password auth, sessions in Postgres
- **Vitest** — RBAC unit tests + tenant-isolation integration tests

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, BETTER_AUTH_SECRET, …
npm run db:migrate      # apply Prisma migrations
npm run db:seed         # optional: Lernio demo workspace
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database & auth

Required env vars (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Prisma + app) |
| `BETTER_AUTH_SECRET` | Session signing secret (64 hex chars) |
| `BETTER_AUTH_URL` | Auth base URL, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (used by proxy/redirects) |
| `TEST_DATABASE_URL` | Optional — dedicated Neon branch for the test suite |

### Tests

```bash
npm test                # RBAC, tenant-isolation, course/class & authoring, lesson-viewer, class-progress, plan & study engine tests
```

Integration tests run against `TEST_DATABASE_URL` (a dedicated Neon branch) and never touch the development database. Apply migrations to it once with `DATABASE_URL=<test-url> npm run db:deploy`.

### Optional: online AI coach

Set either `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) in your environment. Without it, the app uses a built-in rule-based coach and writing/speaking analyzers, so everything still works.

## Data & privacy

The **demo app** stores its data in the browser's `localStorage` under the key `germain:db:v1` — your data never leaves your device, but it is tied to one browser.

Accounts, organizations and memberships live in the **Lernio database** (Postgres). So far it stores authentication, org membership, roles, invitations, the audit log, courses/classes/enrollments, and — since Phase 3 — each learner's study state (vocabulary, plan, progress, mistakes, mock results, achievements, settings).

## Deploy

Deploy to any platform that runs Next.js (Vercel, Netlify, Cloudflare Pages, a Node server):

```bash
npm run build
npm start
```

Set `DATABASE_URL` (a Neon/Postgres connection string), run `npx prisma migrate deploy` and `npm run db:seed`, then build and start. On Vercel, import the repo, set `DATABASE_URL` as an environment variable and it builds with zero configuration.

## Project structure

```
src/
  app/                 # Pages (landing, onboarding, app shell, feature pages, /api/ai)
  components/
    layout/            # Sidebar, mobile nav, nav config
    shared/            # PageHeader, comprehension exercise, etc.
    ui/                # shadcn/ui components
  lib/
    ai/                # Coach, writing & speaking analyzers, LLM client
    db/                # localStorage persistence + seed content (all real, German-only)
    engine/            # Plan generation, adaptation, readiness, analytics, SRS, gamification
    store/             # React context store wrapping the data layer
  types/               # All domain types
```

The data layer (`src/lib/db`) is intentionally isolated behind the store, so a real database (e.g. PostgreSQL/Prisma) can replace `localStorage` without touching the UI.
