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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/lib/store/app-store';
import { AppStatus, JobApplication } from '@/types';
import { uid } from '@/lib/db/storage';
import { cn } from '@/lib/utils';
import { Briefcase, Plus, Trash2 } from 'lucide-react';

const STATUSES: AppStatus[] = [
  'researching',
  'preparing',
  'ready',
  'applied',
  'interview',
  'waiting',
  'accepted',
  'rejected',
];

const STATUS_LABEL: Record<AppStatus, string> = {
  researching: 'Researching',
  preparing: 'Preparing',
  ready: 'Ready to send',
  applied: 'Applied',
  interview: 'Interview',
  waiting: 'Waiting',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const STATUS_STYLE: Record<AppStatus, string> = {
  researching: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  preparing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ready: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  applied: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  interview: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  waiting: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export default function ApplicationsPage() {
  const { db, upsertApplication, deleteApplication } = useApp();
  const applications = useMemo(() => db?.applications ?? [], [db]);
  const [filter, setFilter] = useState<AppStatus | 'all'>('all');
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!db) return null;

  const ausbildungType = db.user?.targetAusbildung ?? 'Fachinformatiker – Anwendungsentwicklung';
  const visible = applications.filter((a) => filter === 'all' || a.status === filter);
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <PageHeader
        title="Applications"
        description="Bewerbungen — track every application from research to interview."
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New application
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit application' : 'Add application'}</DialogTitle>
                <DialogDescription>
                  Track a company you are applying to or plan to apply to.
                </DialogDescription>
              </DialogHeader>
              <ApplicationForm
                initial={editing}
                defaultAusbildungType={ausbildungType}
                onSave={(data) => {
                  const now = new Date().toISOString();
                  if (editing) {
                    upsertApplication({ ...editing, ...data, updatedAt: now });
                  } else {
                    const full: JobApplication = {
                      ...data,
                      id: uid('app'),
                      state: data.state ?? data.city,
                      documents: [],
                      createdAt: now,
                      updatedAt: now,
                    };
                    upsertApplication(full);
                  }
                  setEditing(null);
                  setDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs transition-colors',
            filter === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
          )}
        >
          All ({applications.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
              filter === s ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            {STATUS_LABEL[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{a.company}</CardTitle>
                    <CardDescription>{a.position}</CardDescription>
                  </div>
                  <Badge className={STATUS_STYLE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{a.city}</span>
                  {a.deadline ? (
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      Deadline {new Date(a.deadline).toLocaleDateString()}
                    </span>
                  ) : null}
                  {a.isDemo ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Demo</span> : null}
                </div>

                {a.appliedDate ? (
                  <p className="text-xs text-muted-foreground">Applied {new Date(a.appliedDate).toLocaleDateString()}</p>
                ) : null}
                {a.interviewDate ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Interview {new Date(a.interviewDate).toLocaleDateString()}</p>
                ) : null}
                {a.contactPerson ? (
                  <p className="text-xs text-muted-foreground">Contact: {a.contactPerson}</p>
                ) : null}
                {a.notes ? <p className="text-xs text-muted-foreground">{a.notes}</p> : null}

                {a.documents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {a.documents.map((d) => (
                      <span key={d} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{d}</span>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t pt-3">
                  <Select
                    value={a.status}
                    onValueChange={(v) => upsertApplication({ ...a, status: v as AppStatus, updatedAt: new Date().toISOString() })}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(a);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-500"
                      onClick={() => deleteApplication(a.id)}
                    >
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
  );
}

function ApplicationForm({
  initial,
  defaultAusbildungType,
  onSave,
}: {
  initial: JobApplication | null;
  defaultAusbildungType: string;
  onSave: (data: {
    company: string;
    position: string;
    ausbildungType: string;
    city: string;
    state?: string;
    website?: string;
    deadline?: string;
    contactPerson?: string;
    notes?: string;
    status: AppStatus;
  }) => void;
}) {
  const [company, setCompany] = useState(initial?.company ?? '');
  const [position, setPosition] = useState(initial?.position ?? '');
  const [ausbildungType, setAusbildungType] = useState(initial?.ausbildungType ?? defaultAusbildungType);
  const [city, setCity] = useState(initial?.city ?? '');
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [deadline, setDeadline] = useState(initial?.deadline ? initial.deadline.slice(0, 10) : '');
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const valid = company.trim() && position.trim() && city.trim();

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Company</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme GmbH" />
        </div>
        <div className="space-y-1.5">
          <Label>Position</Label>
          <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Fachinformatiker – Anwendungsentwicklung" />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Berlin" />
        </div>
        <div className="space-y-1.5">
          <Label>Ausbildung type</Label>
          <Input value={ausbildungType} onChange={(e) => setAusbildungType(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Contact person</Label>
          <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Frau Schmidt" />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anschreiben anpassen, Fokus auf SQL…" />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!valid}
          onClick={() =>
            onSave({
              company,
              position,
              ausbildungType,
              city,
              state: initial?.state,
              website: website || undefined,
              deadline: deadline ? new Date(deadline).toISOString() : undefined,
              contactPerson: contactPerson || undefined,
              notes: notes || undefined,
              status: initial?.status ?? 'researching',
            })
          }
        >
          {initial ? 'Save changes' : 'Add application'}
        </Button>
      </DialogFooter>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Briefcase className="h-6 w-6" />
        </div>
        <p className="font-medium text-foreground">No applications here</p>
        <p className="text-sm text-muted-foreground">
          Add your first application or change the filter to see more.
        </p>
      </CardContent>
    </Card>
  );
}
