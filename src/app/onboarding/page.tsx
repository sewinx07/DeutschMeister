'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store/app-store';
import { uid } from '@/lib/db/storage';
import type { CefrLevel, ExamType, SkillKey, UserProfile } from '@/types';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const EXAMS: ExamType[] = ['Goethe-Zertifikat', 'telc Deutsch', 'ÖSD', 'TestDaF', 'DTZ', 'Fachsprachprüfung', 'Other'];
const AUSBILDUNG_OPTIONS = [
  { id: 'fae', title: 'Fachinformatiker — Anwendungsentwicklung', focus: 'Software, programming, databases' },
  { id: 'fsi', title: 'Fachinformatiker — Systemintegration', focus: 'Networks, Linux, servers, infrastructure' },
  { id: 'fdpa', title: 'Fachinformatiker — Daten- und Prozessanalyse', focus: 'Data analysis, SQL, BI' },
  { id: 'itse', title: 'IT-System-Elektroniker', focus: 'Hardware, networks, electronics' },
];

const IT_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'HTML', 'CSS', 'React',
  'Linux', 'Windows', 'Git', 'Docker', 'SQL', 'PostgreSQL', 'GitHub',
  'APIs', 'Networking', 'Cybersecurity', 'Cloud',
];

const REGIONS = [
  'Berlin', 'Hamburg', 'Munich (Bayern)', 'Cologne (NRW)', 'Frankfurt (Hessen)',
  'Stuttgart (Baden-Württemberg)', 'Dresden (Sachsen)', 'Hannover (Niedersachsen)',
];

const ASSESS: { skill: SkillKey; label: string; de: string; question: string; options: string[]; answer: string }[] = [
  { skill: 'vocabulary', label: 'Vocabulary', de: 'Wortschatz', question: 'What does "die Bewerbung" mean?', options: ['The application', 'The interview', 'The salary', 'The contract'], answer: 'The application' },
  { skill: 'grammar', label: 'Grammar', de: 'Grammatik', question: 'Ich ___ Deutsch (I learn German).', options: ['lernt', 'lerne', 'lernen', 'lernst'], answer: 'lerne' },
  { skill: 'reading', label: 'Reading', de: 'Lesen', question: '"Der Kurs beginnt am Montag um 9 Uhr." When does the course start?', options: ['Tuesday', 'Monday', 'Friday', 'Sunday'], answer: 'Monday' },
  { skill: 'listening', label: 'Listening', de: 'Hören', question: '"Wie bitte? Können Sie das wiederholen?" What is the person saying?', options: ['Asking to repeat', 'Saying goodbye', 'Ordering food', 'Asking for time'], answer: 'Asking to repeat' },
];

const STEP_TITLES = [
  'Welcome', 'Your level', 'Your exam', 'Exam date', 'Daily time',
  'Quick check', 'Ausbildung goal', 'IT skills', 'Regions', 'Your roadmap',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<CefrLevel>('A2');
  const [targetLevel, setTargetLevel] = useState<CefrLevel>('B1');
  const [examType, setExamType] = useState<ExamType>('Goethe-Zertifikat');
  const [examDate, setExamDate] = useState('2026-09-24');
  const [dailyMinutes, setDailyMinutes] = useState(90);
  const [selfRatings, setSelfRatings] = useState<Record<SkillKey, number>>({
    vocabulary: 5, grammar: 4, reading: 6, listening: 4, writing: 4, speaking: 3,
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ausbildung, setAusbildung] = useState(AUSBILDUNG_OPTIONS[0].id);
  const [itSkills, setItSkills] = useState<string[]>(['JavaScript', 'HTML', 'CSS', 'Git', 'GitHub']);
  const [regions, setRegions] = useState<string[]>(['Berlin', 'Hamburg']);
  const [finishing, setFinishing] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return name.trim().length >= 2;
      case 3:
        return !!examDate;
      case 8:
        return regions.length > 0;
      default:
        return true;
    }
  }, [step, name, examDate, regions]);

  const computedScores = useMemo(() => {
    const scores: Partial<Record<SkillKey, number>> = {};
    for (const item of ASSESS) {
      const isCorrect = answers[item.skill] === item.answer;
      scores[item.skill] = Math.round((selfRatings[item.skill] / 10) * 50 + (isCorrect ? 50 : 30));
    }
    scores.writing = Math.round((selfRatings.writing / 10) * 100);
    scores.speaking = Math.round((selfRatings.speaking / 10) * 100);
    return scores;
  }, [answers, selfRatings]);

  const finish = () => {
    if (finishing) return;
    setFinishing(true);
    const profile: UserProfile = {
      id: uid('user'),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      currentLevel: level,
      targetLevel,
      examType,
      examDate: new Date(examDate + 'T09:00:00').toISOString(),
      dailyStudyMinutes: dailyMinutes,
      strengths: [],
      weaknesses: [],
      targetAusbildung: AUSBILDUNG_OPTIONS.find((o) => o.id === ausbildung)?.title ?? 'Fachinformatiker',
      itField: ausbildung,
      preferredRegions: regions,
      onboarded: true,
    };
    completeOnboarding(profile, computedScores);
    router.replace('/dashboard');
  };

  const next = () => {
    if (!canProceed) return;
    const target = Math.min(9, step + 1);
    if (target === 9) {
      setDaysLeft(Math.max(0, Math.ceil((new Date(examDate + 'T09:00:00').getTime() - Date.now()) / 86400000)));
    }
    setStep(target);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {step + 1} of 10</span>
              <span className="font-medium text-foreground">{STEP_TITLES[step]}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${((step + 1) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <StepWelcome name={name} setName={setName} />
          )}
          {step === 1 && (
            <StepLevel
              level={level}
              setLevel={setLevel}
              targetLevel={targetLevel}
              setTargetLevel={setTargetLevel}
            />
          )}
          {step === 2 && (
            <StepExam examType={examType} setExamType={setExamType} />
          )}
          {step === 3 && (
            <StepDate examDate={examDate} setExamDate={setExamDate} />
          )}
          {step === 4 && (
            <StepTime dailyMinutes={dailyMinutes} setDailyMinutes={setDailyMinutes} />
          )}
          {step === 5 && (
            <StepAssessment
              selfRatings={selfRatings}
              setSelfRatings={setSelfRatings}
              answers={answers}
              setAnswers={setAnswers}
            />
          )}
          {step === 6 && (
            <StepAusbildung ausbildung={ausbildung} setAusbildung={setAusbildung} />
          )}
          {step === 7 && (
            <StepItSkills itSkills={itSkills} setItSkills={setItSkills} />
          )}
          {step === 8 && (
            <StepRegions regions={regions} setRegions={setRegions} />
          )}
          {step === 9 && (
            <StepSummary
              name={name}
              level={level}
              targetLevel={targetLevel}
              examType={examType}
              dailyMinutes={dailyMinutes}
              daysLeft={daysLeft}
              scores={computedScores}
              ausbildung={AUSBILDUNG_OPTIONS.find((o) => o.id === ausbildung)?.title ?? ''}
            />
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {step < 9 ? (
            <Button onClick={next} disabled={!canProceed}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={finishing}>
              {finishing ? 'Building your plan…' : 'Generate my roadmap'}
              {!finishing && <CheckCircle2 className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepWelcome({ name, setName }: { name: string; setName: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Welcome 👋</h2>
        <p className="text-sm text-muted-foreground">
          I&apos;m your German exam + IT Ausbildung coach. First, how should I call you?
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-name">Your name</Label>
        <Input
          id="onboarding-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Anna"
          autoFocus
        />
      </div>
    </div>
  );
}

function StepLevel({
  level, setLevel, targetLevel, setTargetLevel,
}: {
  level: CefrLevel;
  setLevel: (v: CefrLevel) => void;
  targetLevel: CefrLevel;
  setTargetLevel: (v: CefrLevel) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Your German level</h2>
        <p className="text-sm text-muted-foreground">Where are you now, and where do you need to be?</p>
      </div>
      <div className="space-y-2">
        <Label>Current level</Label>
        <LevelPicker value={level} onChange={setLevel} />
      </div>
      <div className="space-y-2">
        <Label>Target level</Label>
        <LevelPicker value={targetLevel} onChange={setTargetLevel} />
      </div>
    </div>
  );
}

function LevelPicker({ value, onChange }: { value: CefrLevel; onChange: (v: CefrLevel) => void }) {
  return (
    <div className="flex gap-2">
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn(
            'flex h-12 flex-1 items-center justify-center rounded-lg border text-sm font-semibold transition-colors',
            value === l
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-accent'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function StepExam({ examType, setExamType }: { examType: ExamType; setExamType: (v: ExamType) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Which exam are you preparing for?</h2>
        <p className="text-sm text-muted-foreground">You can change this later in Settings.</p>
      </div>
      <RadioGroup value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
        {EXAMS.map((e) => (
          <div key={e} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <Label htmlFor={`exam-${e}`} className="cursor-pointer font-medium">{e}</Label>
            <RadioGroupItem id={`exam-${e}`} value={e} />
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function StepDate({ examDate, setExamDate }: { examDate: string; setExamDate: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">When is your exam?</h2>
        <p className="text-sm text-muted-foreground">The countdown and study plan will be built around this date.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="exam-date">Exam date</Label>
        <Input id="exam-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
      </div>
    </div>
  );
}

function StepTime({ dailyMinutes, setDailyMinutes }: { dailyMinutes: number; setDailyMinutes: (v: number) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">How much time per day?</h2>
        <p className="text-sm text-muted-foreground">Be realistic. Consistency beats intensity.</p>
      </div>
      <div className="space-y-3">
        <div className="text-center">
          <span className="text-4xl font-bold tabular-nums text-foreground">{dailyMinutes}</span>
          <span className="ml-2 text-lg text-muted-foreground">min/day</span>
        </div>
        <Slider value={[dailyMinutes]} onValueChange={(v) => setDailyMinutes(v[0])} min={15} max={240} step={5} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>15 min</span>
          <span>2h — balanced</span>
          <span>4h — intensive</span>
        </div>
      </div>
    </div>
  );
}

function StepAssessment({
  selfRatings, setSelfRatings, answers, setAnswers,
}: {
  selfRatings: Record<SkillKey, number>;
  setSelfRatings: (v: Record<SkillKey, number>) => void;
  answers: Record<string, string>;
  setAnswers: (v: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Quick skill check</h2>
        <p className="text-sm text-muted-foreground">
          Rate each skill honestly and answer the sample questions. This shapes your first plan.
        </p>
      </div>
      <div className="space-y-6">
        {ASSESS.map((item) => (
          <div key={item.skill} className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{item.label} <span className="text-muted-foreground">({item.de})</span></p>
              <span className="text-sm font-semibold tabular-nums text-primary">{selfRatings[item.skill]}/10</span>
            </div>
            <Slider
              className="mt-2"
              value={[selfRatings[item.skill]]}
              onValueChange={(v) => setSelfRatings({ ...selfRatings, [item.skill]: v[0] })}
              min={1}
              max={10}
              step={1}
            />
            <div className="mt-3 space-y-1.5">
              <p className="text-sm text-muted-foreground">{item.question}</p>
              <RadioGroup
                value={answers[item.skill] ?? ''}
                onValueChange={(v) => setAnswers({ ...answers, [item.skill]: v })}
              >
                {item.options.map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`${item.skill}-${opt}`} />
                    <Label htmlFor={`${item.skill}-${opt}`} className="cursor-pointer text-sm">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <SelfSlider label="Writing" de="Schreiben" value={selfRatings.writing} onChange={(v) => setSelfRatings({ ...selfRatings, writing: v })} />
          <SelfSlider label="Speaking" de="Sprechen" value={selfRatings.speaking} onChange={(v) => setSelfRatings({ ...selfRatings, speaking: v })} />
        </div>
      </div>
    </div>
  );
}

function SelfSlider({ label, de, value, onChange }: { label: string; de: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">{label} <span className="text-muted-foreground">({de})</span></p>
        <span className="text-sm font-semibold tabular-nums text-primary">{value}/10</span>
      </div>
      <Slider className="mt-2" value={[value]} onValueChange={(v) => onChange(v[0])} min={1} max={10} step={1} />
    </div>
  );
}

function StepAusbildung({ ausbildung, setAusbildung }: { ausbildung: string; setAusbildung: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Your IT Ausbildung target</h2>
        <p className="text-sm text-muted-foreground">Which path do you want to pursue in Germany?</p>
      </div>
      <div className="space-y-2">
        {AUSBILDUNG_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setAusbildung(opt.id)}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
              ausbildung === opt.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
            )}
          >
            <Briefcase className={cn('mt-0.5 h-4 w-4 shrink-0', ausbildung === opt.id ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <p className="font-medium text-foreground">{opt.title}</p>
              <p className="text-xs text-muted-foreground">{opt.focus}</p>
            </div>
            {ausbildung === opt.id && <Check className="ml-auto h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepItSkills({ itSkills, setItSkills }: { itSkills: string[]; setItSkills: (v: string[]) => void }) {
  const toggle = (s: string) =>
    setItSkills(itSkills.includes(s) ? itSkills.filter((x) => x !== s) : [...itSkills, s]);
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Your technical skills</h2>
        <p className="text-sm text-muted-foreground">Select what you already know — we&apos;ll build a skill tracker later.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {IT_SKILLS.map((s) => {
          const on = itSkills.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                on
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent'
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepRegions({ regions, setRegions }: { regions: string[]; setRegions: (v: string[]) => void }) {
  const toggle = (r: string) =>
    setRegions(regions.includes(r) ? regions.filter((x) => x !== r) : [...regions, r]);
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Preferred German regions</h2>
        <p className="text-sm text-muted-foreground">We&apos;ll use these when recommending applications.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {REGIONS.map((r) => {
          const on = regions.includes(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => toggle(r)}
              className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                on ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {r}
              {on && <Check className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSummary({
  name, level, targetLevel, examType, dailyMinutes, daysLeft, scores, ausbildung,
}: {
  name: string;
  level: CefrLevel;
  targetLevel: CefrLevel;
  examType: ExamType;
  dailyMinutes: number;
  daysLeft: number;
  scores: Partial<Record<SkillKey, number>>;
  ausbildung: string;
}) {
  const weakest = (Object.entries(scores) as [SkillKey, number][]).sort((a, b) => a[1] - b[1])[0];
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Your roadmap is ready, {name.split(' ')[0]} 🎉</h2>
        <p className="text-sm text-muted-foreground">Here&apos;s what your plan looks like:</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SummaryItem label="Exam" value={`${examType}`} />
        <SummaryItem label="Countdown" value={`${daysLeft} days`} highlight />
        <SummaryItem label="Level" value={`${level} → ${targetLevel}`} />
        <SummaryItem label="Daily time" value={`${dailyMinutes} min`} />
      </div>
      <div className="rounded-xl border p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Skill profile</p>
        <div className="space-y-1.5">
          {(Object.entries(scores) as [SkillKey, number][]).map(([skill, score]) => (
            <div key={skill} className="flex items-center gap-2 text-sm">
              <span className="w-20 capitalize text-muted-foreground">{skill}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
              </div>
              <span className="w-8 text-right tabular-nums text-muted-foreground">{Math.round(score)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          <strong>Weakest skill:</strong> {weakest?.[0]} ({Math.round(weakest?.[1] ?? 0)}%). Your first plan will focus extra time here.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Ausbildung target: <span className="font-medium text-foreground">{ausbildung}</span>
      </p>
    </div>
  );
}

function SummaryItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-3', highlight && 'border-primary bg-primary/5')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
