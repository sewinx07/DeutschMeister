# DeutschMeister

A personal command center for passing your German exam and landing an IT-Ausbildung in Germany. Adaptive study plans, spaced-repetition vocabulary, grammar drills, mock exams, an AI coach, and a full career toolkit — all in one app.

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
- **Zod** for AI output validation

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: online AI coach

Set either `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) in your environment. Without it, the app uses a built-in rule-based coach and writing/speaking analyzers, so everything still works.

## Data & privacy

There is **no backend**. All data (plan, vocabulary, mistakes, applications, settings) is stored in the browser's `localStorage` under the key `germain:db:v1`. Your data never leaves your device — but it is tied to one browser, so clear your browser data and progress is gone.

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
