'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store/app-store';
import { diffDays } from '@/lib/db/storage';
import { Briefcase, CheckCircle2, Circle, FileText, GraduationCap, Rocket, Send } from 'lucide-react';
import Link from 'next/link';

const SPECIALIZATIONS = [
  {
    title: 'Anwendungsentwicklung',
    tagline: 'Build software for users and businesses.',
    skills: ['Programming', 'Frontend & Backend', 'Databases', 'Testing'],
    tech: ['Java', 'C#/.NET', 'JavaScript/TypeScript', 'Python', 'SQL'],
  },
  {
    title: 'Systemintegration',
    tagline: 'Connect, operate and secure IT systems.',
    skills: ['Networking', 'Servers & Cloud', 'Security', 'Virtualisation'],
    tech: ['Linux', 'Windows Server', 'Docker', 'Networking', 'Cloud'],
  },
  {
    title: 'Daten- und Prozessanalyse',
    tagline: 'Turn data into decisions and automation.',
    skills: ['Data analysis', 'Process modelling', 'Dashboards', 'Automation'],
    tech: ['SQL', 'Python', 'Power BI', 'Excel', 'ETL'],
  },
  {
    title: 'Digitale Vernetzung',
    tagline: 'Networks, IoT and industrial connectivity.',
    skills: ['Network design', 'IoT', 'Security', 'Automation'],
    tech: ['Cisco', 'Linux', 'Wireless', 'Sensors', 'Cloud'],
  },
];

export default function AusbildungPage() {
  const { db, updateDocument } = useApp();
  const applications = useMemo(() => db?.applications ?? [], [db]);
  const projects = useMemo(() => db?.projects ?? [], [db]);
  const documents = useMemo(() => db?.documents ?? [], [db]);

  if (!db || !db.user) return null;

  const target = db.user.targetAusbildung ?? 'Fachinformatiker';
  const daysLeft = diffDays(new Date(), new Date(db.user.examDate));
  const doneDocs = documents.filter((d) => d.status === 'done').length;
  const applied = applications.filter((a) => a.status === 'applied' || a.status === 'interview' || a.status === 'accepted').length;
  const published = projects.filter((p) => p.status === 'done' || p.status === 'published').length;

  const steps = [
    {
      title: 'German exam',
      desc: `Pass ${db.user.examType} by ${new Date(db.user.examDate).toLocaleDateString()} (${daysLeft} days left).`,
      progress: Math.min(100, Math.round((db.mockResults.length / 3) * 100)),
      href: '/mock-exams',
      icon: GraduationCap,
    },
    {
      title: 'Portfolio & skills',
      desc: `${published} of 2+ projects published, ${db.techSkills.filter((s) => s.level === 'intermediate' || s.level === 'advanced').length} skills at intermediate level.`,
      progress: Math.min(100, Math.round((published / 2) * 100)),
      href: '/it-skills',
      icon: Rocket,
    },
    {
      title: 'Documents',
      desc: `${doneDocs} of ${documents.length || 3} documents ready (Lebenslauf, Anschreiben, Zeugnisse).`,
      progress: Math.min(100, Math.round((doneDocs / Math.max(documents.length, 3)) * 100)),
      href: '/ausbildung#documents',
      icon: FileText,
    },
    {
      title: 'Applications',
      desc: `${applied} applications sent or in interview. Target: 10+ before the exam.`,
      progress: Math.min(100, Math.round((applied / 10) * 100)),
      href: '/applications',
      icon: Send,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ausbildung Roadmap"
        description="Your step-by-step path from German exam to an IT-Ausbildung in Germany."
      />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{target}</p>
                <p className="text-sm text-muted-foreground">
                  Exam: {db.user.examType} · {db.user.targetLevel} · {db.user.preferredRegions?.join(', ') || 'Flexible'}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="px-3 py-1">{daysLeft} days to exam</Badge>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <Link key={step.title} href={step.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{i + 1}. {step.title}</p>
                    <Badge variant="outline" className="text-xs">{step.progress}%</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{step.desc}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div id="documents">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Document preparation</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-start gap-3 p-5">
                <button
                  type="button"
                  onClick={() => updateDocument(d.id, { status: d.status === 'done' ? 'in_progress' : 'done' })}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                  aria-label={d.status === 'done' ? 'Mark as not done' : 'Mark as done'}
                >
                  {d.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{d.title}</p>
                    <Badge
                      variant="outline"
                      className={
                        d.status === 'done'
                          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                          : d.status === 'in_progress'
                            ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground'
                      }
                    >
                      {d.status === 'done' ? 'Done' : d.status === 'in_progress' ? 'In progress' : 'To do'}
                    </Badge>
                  </div>
                  {d.content ? <p className="mt-1 text-xs text-muted-foreground">{d.content}</p> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Fachinformatiker specializations</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SPECIALIZATIONS.map((s) => (
            <Card key={s.title} className={s.title === target.replace(/^Fachinformatiker\s*(?:–\s*)?/, '') ? 'border-primary/50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {s.title}
                  {s.title === target.replace(/^Fachinformatiker\s*(?:–\s*)?/, '') ? (
                    <Badge className="bg-primary text-primary-foreground">Your target</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{s.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {s.skills.map((k) => (
                    <span key={k} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{k}</span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.tech.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
