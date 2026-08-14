import type { Database, SkillKey } from '@/types';
import { diffDays, formatDate } from '../db/storage';
import { computeReadiness, streakDays } from '../engine/readiness';
import { identifyWeakestSkill } from '../engine/adapt';
import { skillAverage } from '../engine/readiness';
import { dueWords } from '../engine/srs';
import { todaysTasks, upcomingTasks } from '../engine/plan';
import { totalStudyMinutes } from '../engine/analytics';

export interface CoachContext {
  db: Database;
  today: string;
}

type Intent =
  | 'today'
  | 'ready'
  | 'grammar_why'
  | 'quiz'
  | 'vocab_work'
  | 'speaking'
  | 'job_vocab'
  | 'time'
  | 'weakness'
  | 'progress'
  | 'ausbildung'
  | 'motivate'
  | 'greeting'
  | 'unknown';

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
  { intent: 'today', patterns: [/what.*(today|heute|now|study)/i, /should.*(study|do|learn).*today/i, /today.*(plan|task|mission)/i, /heute/i] },
  { intent: 'ready', patterns: [/am i ready/i, /ready.*(exam|pr(u|ü)fung)/i, /can i pass/i, /bestehen/i, /readiness/i] },
  { intent: 'grammar_why', patterns: [/why.*(wrong|incorrect|error|grammar)/i, /explain.*grammar/i, /warum.*falsch/i, /grammar.*(wrong|mistake)/i] },
  { intent: 'quiz', patterns: [/(quiz|test|practice|fragen|questions).*(vocab|words|wortschatz)/i, /give me.*(vocabulary|words).*questions/i, /w[oö]rter.*fragen/i, /quiz me/i] },
  { intent: 'vocab_work', patterns: [/(vocab|word|wort|vokabel).*(learn|practice|repeat|review|study)/i, /vokabeln.*(lernen|wiederholen)/i] },
  { intent: 'speaking', patterns: [/speak.*(with me|practice|german)/i, /practice speaking/i, /sprechen/i, /conversation/i, /interview practice/i] },
  { intent: 'job_vocab', patterns: [/job.*(vocab|words|vokabeln)/i, /(arbeit|beruf|bewerbung|ausbildung).*(vokabeln|w[oö]rter|vocab)/i, /german.*(job|work).*words/i] },
  { intent: 'time', patterns: [/only.*(\d+.*min|minutes|zeit)/i, /45 minutes/i, /30 minutes/i, /little time/i, /wenig zeit/i, /kurz/i] },
  { intent: 'weakness', patterns: [/weak(est)?.*(skill|area|point)/i, /what.*(weak|bad) at/i, /schw[äa]ch/i] },
  { intent: 'progress', patterns: [/how.*(doing|progress|improve)/i, /progress/i, /fortschritt/i, /how.*learned/i] },
  { intent: 'ausbildung', patterns: [/ausbildung/i, /which.*(it field|career|specialization)/i, /fachinformatiker/i, /systemintegration/i, /anwendungsentwicklung/i, /beruf/i] },
  { intent: 'motivate', patterns: [/motivat/i, /lose (hope|motivation)/i, /tired/i, /give up/i, /discourag/i, /müde/i] },
  { intent: 'greeting', patterns: [/^(hi|hello|hey|hallo|guten tag|guten morgen)\b/i] },
];

export function detectIntent(message: string): Intent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const p of patterns) {
      if (p.test(message)) return intent;
    }
  }
  return 'unknown';
}

export function coachReply(ctx: CoachContext, message: string): string {
  const intent = detectIntent(message);
  const { db } = ctx;

  try {
    switch (intent) {
      case 'today':
        return todayReply(ctx);
      case 'ready':
        return readyReply(ctx);
      case 'grammar_why':
        return grammarWhyReply(db);
      case 'quiz':
        return quizReply(db);
      case 'vocab_work':
        return vocabWorkReply(db);
      case 'speaking':
        return speakingReply(db);
      case 'job_vocab':
        return jobVocabReply();
      case 'time':
        return timeReply(ctx, message);
      case 'weakness':
        return weaknessReply(db);
      case 'progress':
        return progressReply(db);
      case 'ausbildung':
        return ausbildungReply(db);
      case 'motivate':
        return motivateReply(db);
      case 'greeting':
        return greetingReply(ctx);
      default:
        return unknownReply(ctx);
    }
  } catch {
    return unknownReply(ctx);
  }
}

function name(db: Database): string {
  return db.user?.name?.split(' ')[0] || 'there';
}

function greetingReply(ctx: CoachContext): string {
  const { db } = ctx;
  const tasks = todaysTasks(db.tasks);
  const done = tasks.filter((t) => t.status === 'done').length;
  return `Hallo ${name(db)}! 👋 I'm your German coach.\n\nYou have ${tasks.length} task${tasks.length === 1 ? '' : 's'} planned today and ${done} completed. Ask me: "What should I study today?", "Am I ready for my exam?", "Quiz me on vocabulary", or "Practice speaking with me".`;
}

function todayReply(ctx: CoachContext): string {
  const { db, today } = ctx;
  const tasks = todaysTasks(db.tasks).filter((t) => !t.isRest);
  const done = tasks.filter((t) => t.status === 'done');
  const totalMinutes = tasks.reduce((a, t) => a + t.durationMinutes, 0);
  const pending = tasks.filter((t) => t.status !== 'done');

  if (tasks.length === 0) {
    const upcoming = upcomingTasks(db.tasks, new Date(today), 3);
    if (upcoming.length === 0) {
      return `Your plan hasn't been generated yet. Complete onboarding or visit Settings → Study plan to generate it.`;
    }
    const lines = upcoming.map((t) => `• ${t.date}: ${t.title} (${t.durationMinutes} min)`);
    return `No tasks are scheduled for today. Here are your next tasks:\n${lines.join('\n')}\n\nYou have ${db.user?.dailyStudyMinutes ?? 60} min available per day.`;
  }

  const lines = pending.map(
    (t, i) =>
      `${i + 1}. ${t.title} — ${t.durationMinutes} min (${t.skill})`
  );
  return `Here is your plan for today (${today}):\n${lines.join('\n')}\n\nTotal: ~${totalMinutes} min. ${done.length ? `\n✅ Already done: ${done.length} task${done.length === 1 ? '' : 's'}.` : ''}\nStart with the highest priority: ${pending[0]?.title ?? 'review mistakes'}.`;
}

function readyReply(ctx: CoachContext): string {
  const { db } = ctx;
  const user = db.user!;
  const consistency = Math.min(1, streakDays(db) / 14);
  const completed = db.studySessions.filter((s) => s.completed).length;
  const report = computeReadiness(user, db.skills, db.mockResults, consistency, completed);
  const daysLeft = diffDays(new Date(), new Date(user.examDate));
  return `Your current exam readiness is ${report.score}% (target ${report.target}%).\n\nConfidence: ${report.confidence}. You have ${daysLeft} day${daysLeft === 1 ? '' : 's'} until ${user.examType} on ${formatDate(user.examDate)}.\n\n${report.biggestRisk ? `⚠️ Biggest risk: ${report.biggestRisk}. ` : ''}${report.recommendedAction}`;
}

function grammarWhyReply(db: Database): string {
  const recent = db.mistakes
    .filter((m) => m.category === 'grammar' || m.subcategory)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pick = recent[0];
  if (!pick) {
    return `I don't have a specific recent mistake to explain yet. As you practise, I'll log your mistakes here and can explain each one. For now, tell me a sentence you're unsure about and I'll help.`;
  }
  return `Let me explain your recent mistake:\n\n"${pick.original}" → "${pick.correct}"\n\nWhy: ${pick.reason}\n\nTopic: ${pick.relatedTopic ?? pick.subcategory ?? pick.category}.\n\nReview it in the Mistake Bank to lock it in.`;
}

function quizReply(db: Database): string {
  const due = dueWords(db.vocabulary, 5);
  const pool = due.length >= 5 ? due : db.vocabulary.slice(0, 10);
  if (pool.length === 0) return 'No words available yet.';
  const words = pool.slice(0, 5);
  const lines = words.map((w, i) => {
    if (i % 2 === 0) {
      return `${i + 1}. What is the German article for "${w.english}"? (${w.german})`;
    }
    return `${i + 1}. What does "${w.german}" mean?`;
  });
  return `Here are 5 vocabulary questions:\n\n${lines.join('\n')}\n\nAnswer them in the Vocabulary trainer for spaced repetition, or type your answers and I'll check them.`;
}

function vocabWorkReply(db: Database): string {
  const due = dueWords(db.vocabulary, 20);
  return `You have ${due.length} words due for review right now. Open the Vocabulary section and run a flashcard session — it takes ~10 minutes.\n\n${due.length === 0 ? 'No words are due today. Try learning 8 new words from the "Ausbildung / Work" category.' : `Suggested session: review all ${due.length} due words, then add 5 new ones.`}`;
}

function speakingReply(db: Database): string {
  const weakest = identifyWeakestSkill(db.skills);
  const prompt = db.speakingPrompts.find((p) => p.level === db.user?.targetLevel) ?? db.speakingPrompts[0];
  if (!prompt) return 'Add speaking prompts first.';
  return `Let's practise speaking. Your weakest skill is ${weakest}, so speaking practice helps a lot.\n\nScenario: "${prompt.title}"\n${prompt.situation}\n\nQuestion 1: ${prompt.questions[0]}\n\nAnswer aloud, then come back and I'll analyse your answers. Record yourself in the Speaking module for full feedback.`;
}

function jobVocabReply(): string {
  return `Here are 6 German words every IT applicant should know:\n\n1. die Bewerbung — application\n2. der Lebenslauf — CV\n3. das Anschreiben — cover letter\n4. der Ausbildungsplatz — training place\n5. das Vorstellungsgespräch — job interview\n6. die Ausbildungsvergütung — training allowance\n\nPractice them in Vocabulary → category "Ausbildung / Work".`;
}

function timeReply(ctx: CoachContext, message: string): string {
  const { db } = ctx;
  const match = message.match(/(\d+)\s*(min|minutes|minuten)/i);
  const minutes = match ? Math.min(120, parseInt(match[1], 10)) : 45;
  const tasks = todaysTasks(db.tasks).filter((t) => !t.isRest && t.status !== 'done');
  const sorted = [...tasks].sort((a, b) => {
    const rank: Record<SkillKey, number> = {
      listening: 0, grammar: 1, speaking: 2, vocabulary: 3, reading: 4, writing: 5,
    };
    return (rank[a.skill] ?? 9) - (rank[b.skill] ?? 9);
  });

  let remaining = minutes;
  const chosen: string[] = [];
  for (const t of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(t.durationMinutes, remaining);
    chosen.push(`• ${t.title} — ${take} min`);
    remaining -= take;
  }
  const weakest = identifyWeakestSkill(db.skills);
  if (chosen.length === 0) {
    chosen.push(`• ${weakest} practice — ${Math.min(30, minutes)} min`);
  }
  return `With ${minutes} minutes today, I'd prioritise:\n\n${chosen.join('\n')}\n\nTotal: ~${minutes - remaining} min. ${weakest} is your current weakest area, so I weight it first.`;
}

function weaknessReply(db: Database): string {
  const weakest = identifyWeakestSkill(db.skills);
  const weakestScore = db.skills[weakest].score;
  const avg = skillAverage(db.skills);
  return `Your weakest skill right now is ${weakest} at ${Math.round(weakestScore)}% (your average is ${Math.round(avg)}%).\n\nI've automatically weighted more ${weakest} practice into your plan. Recommended this week: 3 × ${weakest} sessions + mistake review.`;
}

function progressReply(db: Database): string {
  const minutes = totalStudyMinutes(db.studySessions);
  const words = db.vocabulary.filter((v) => v.reviews > 0).length;
  const mocks = db.mockResults.length;
  return `Here's where you stand:\n\n• Total study time: ${Math.round(minutes / 60)}h ${minutes % 60}m\n• Words reviewed: ${words}/${db.vocabulary.length}\n• Mock exams: ${mocks}\n• Current streak: ${streakDays(db)} day${streakDays(db) === 1 ? '' : 's'}\n• Skill average: ${Math.round(skillAverage(db.skills))}%\n\nOpen the Progress page for charts and trends.`;
}

function ausbildungReply(db: Database): string {
  const goal = db.user?.targetAusbildung ?? 'Fachinformatiker';
  return `Your target is ${goal}.\n\nRecommended next steps:\n1. Keep improving German (your exam is the key).\n2. Build a portfolio project with auth + database + API.\n3. Prepare Lebenslauf + Anschreiben (see Document Preparation).\n4. Start researching companies in ${db.user?.preferredRegions?.join(', ') || 'your preferred regions'}.\n\nWhich part do you want to work on?`;
}

function motivateReply(db: Database): string {
  const streak = streakDays(db);
  const mocks = db.mockResults;
  const trend = mocks.length >= 2 ? `${mocks[0].percent}% → ${mocks[mocks.length - 1].percent}%` : 'not enough data yet';
  return `You're here for a reason — and you're making real progress.\n\n• ${streak}-day streak\n• Mock exam trend: ${trend}\n\nLearning a language + preparing a career change at the same time is hard. But every 25-minute session compounds. Take a 10-minute break, then do one small task. You've got ${diffDays(new Date(), new Date(db.user?.examDate ?? new Date()))} days left — enough time if you stay steady.`;
}

function unknownReply(ctx: CoachContext): string {
  const { db } = ctx;
  const weakest = identifyWeakestSkill(db.skills);
  return `I want to help with real answers, but I need a concrete question. Try:\n\n• "What should I study today?"\n• "Am I ready for my exam?"\n• "Quiz me on vocabulary"\n• "Practice speaking with me"\n• "I only have 45 minutes today"\n• "Why is this grammar wrong?"\n\nYour current focus should be ${weakest}. What would you like?`;
}
