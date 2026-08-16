# DeutschMeister

A personal command center for passing your German exam and landing an IT-Ausbildung in Germany. Adaptive study plans, spaced-repetition vocabulary, grammar drills, mock exams, an AI coach, and a full career toolkit — all in one app.

> **Lernio platform (in progress).** The app is being rebuilt as **Lernio** — a multi-tenant learning SaaS for individual learners, teachers and schools. Phase 1 (database, authentication, organizations, roles & permissions, tenant isolation, audit log) and Phase 2 (courses, classes and the student/teacher UI) are implemented and tested; the German exam app remains fully functional as the flagship demo.

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
npm test                # RBAC, tenant-isolation, course & class isolation tests
```

Integration tests run against `TEST_DATABASE_URL` (a dedicated Neon branch) and never touch the development database. Apply migrations to it once with `DATABASE_URL=<test-url> npm run db:deploy`.

### Optional: online AI coach

Set either `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) in your environment. Without it, the app uses a built-in rule-based coach and writing/speaking analyzers, so everything still works.

## Data & privacy

The **demo app** stores its data in the browser's `localStorage` under the key `germain:db:v1` — your data never leaves your device, but it is tied to one browser.

Accounts, organizations and memberships live in the **Lernio database** (Postgres). So far it stores authentication, org membership, roles, invitations, the audit log, and the Phase 2 courses/classes/enrollments; per-lesson study data is still client-side until the persistence layer lands in a later phase.

## Deploy

Deploy to any platform that runs Next.js (Vercel, Netlify, Cloudflare Pages, a Node server):

```bash
npm run build
npm start
```

On Vercel, import the repo and it builds with zero configuration. There is no database to provision.

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
