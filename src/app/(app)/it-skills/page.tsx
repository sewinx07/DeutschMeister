'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useApp } from '@/lib/store/app-store';
import { Project, SkillLevel } from '@/types';
import { uid } from '@/lib/db/storage';
import { cn } from '@/lib/utils';
import { FolderGit2, GitBranch, Globe, Plus, Trash2, TrendingUp } from 'lucide-react';

const LEVEL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const PROJECT_STATUS_LABEL: Record<Project['status'], string> = {
  idea: 'Idea',
  in_progress: 'In progress',
  done: 'Done',
  published: 'Published',
};

const PROJECT_STATUS_STYLE: Record<Project['status'], string> = {
  idea: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function ItSkillsPage() {
  const { db, updateTechSkill, upsertProject, deleteProject } = useApp();
  const techSkills = useMemo(() => db?.techSkills ?? [], [db]);
  const projects = useMemo(() => db?.projects ?? [], [db]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!db) return null;

  const categories = Array.from(new Set(techSkills.map((s) => s.category)));
  const avgConfidence = techSkills.length
    ? Math.round((techSkills.reduce((a, s) => a + s.confidence, 0) / techSkills.length) * 100)
    : 0;
  const published = projects.filter((p) => p.status === 'done' || p.status === 'published').length;

  const levelUp = (id: string, level: SkillLevel) => {
    const next = level === 'beginner' ? 'basic' : level === 'basic' ? 'intermediate' : 'advanced';
    updateTechSkill(id, { level: next });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="IT Skills & Portfolio"
        description="Track your technical skills and build projects that make your application stand out."
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit project' : 'Add project'}</DialogTitle>
                <DialogDescription>
                  A real project shows recruiters what you can do.
                </DialogDescription>
              </DialogHeader>
              <ProjectForm
                initial={editingProject}
                onSave={(data) => {
                  const now = new Date().toISOString();
                  if (editingProject) {
                    upsertProject({ ...editingProject, ...data, updatedAt: now });
                  } else {
                    const full: Project = {
                      ...data,
                      id: uid('prj'),
                      readmeDone: false,
                      screenshots: [],
                      createdAt: now,
                      updatedAt: now,
                    };
                    upsertProject(full);
                  }
                  setEditingProject(null);
                  setDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Skills tracked</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{techSkills.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Average confidence</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{avgConfidence}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Projects done/published</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{published}/{projects.length}</p>
          </CardContent>
        </Card>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="mb-3 text-lg font-semibold text-foreground">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {techSkills
              .filter((s) => s.category === cat)
              .map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <Badge variant="outline" className="text-xs">{LEVEL_LABEL[s.level]}</Badge>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                        style={{ width: `${Math.round(s.confidence * 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{s.projectsUsed} project{s.projectsUsed === 1 ? '' : 's'}</span>
                      {s.level !== 'advanced' ? (
                        <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => levelUp(s.id, s.level)}>
                          <TrendingUp className="h-3.5 w-3.5" /> Level up
                        </Button>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Max level</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Projects ({projects.length})</h2>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FolderGit2 className="h-6 w-6" />
              </div>
              <p className="font-medium text-foreground">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Add a project — even a small one with auth, a database and an API.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <Badge className={PROJECT_STATUS_STYLE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <CardDescription className="line-clamp-3">{p.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    {p.technologies.map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {p.readmeDone ? (
                      <span className="text-emerald-600 dark:text-emerald-400">README done</span>
                    ) : (
                      <span>README not written</span>
                    )}
                    {p.githubUrl ? (
                      <a href={p.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                        <GitBranch className="h-3.5 w-3.5" /> GitHub
                      </a>
                    ) : null}
                    {p.demoUrl ? (
                      <a href={p.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                        <Globe className="h-3.5 w-3.5" /> Live
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => upsertProject({ ...p, readmeDone: !p.readmeDone, updatedAt: new Date().toISOString() })}>
                        {p.readmeDone ? 'Unmark README' : 'Mark README done'}
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProject(p);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => deleteProject(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectForm({
  initial,
  onSave,
}: {
  initial: Project | null;
  onSave: (data: {
    title: string;
    description: string;
    technologies: string[];
    githubUrl?: string;
    demoUrl?: string;
    status: Project['status'];
    skills: string[];
  }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [techs, setTechs] = useState(initial?.technologies.join(', ') ?? '');
  const [githubUrl, setGithubUrl] = useState(initial?.githubUrl ?? '');
  const [demoUrl, setDemoUrl] = useState(initial?.demoUrl ?? '');
  const [status, setStatus] = useState<Project['status']>(initial?.status ?? 'idea');

  const valid = title.trim() && description.trim();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bewerbungs-Tracker" />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What does it do? What did you learn?" />
      </div>
      <div className="space-y-1.5">
        <Label>Technologies (comma-separated)</Label>
        <Input value={techs} onChange={(e) => setTechs(e.target.value)} placeholder="React, Next.js, PostgreSQL" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>GitHub URL</Label>
          <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/…" />
        </div>
        <div className="space-y-1.5">
          <Label>Live demo URL</Label>
          <Input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PROJECT_STATUS_LABEL) as Project['status'][]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition-colors',
                status === s ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {PROJECT_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!valid}
          onClick={() =>
            onSave({
              title,
              description,
              technologies: techs.split(',').map((t) => t.trim()).filter(Boolean),
              githubUrl: githubUrl || undefined,
              demoUrl: demoUrl || undefined,
              status,
              skills: [],
            })
          }
        >
          {initial ? 'Save changes' : 'Add project'}
        </Button>
      </DialogFooter>
    </div>
  );
}
