'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/lib/store/app-store';
import { CefrLevel, ExamType } from '@/types';
import { toast } from 'sonner';
import { Bell, Monitor, Moon, Palette, Sun, UserRound } from 'lucide-react';

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const EXAMS: ExamType[] = [
  'Goethe-Zertifikat',
  'telc Deutsch',
  'ÖSD',
  'TestDaF',
  'DTZ',
  'Fachsprachprüfung',
  'Other',
];

export default function SettingsPage() {
  const { db, updateUser, updateSettings, resetAll } = useApp();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [daily, setDaily] = useState('60');
  const [examDate, setExamDate] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  if (!db || !db.user) return null;

  const user = db.user;
  const dirtyName = name.trim() !== user.name;
  const dirtyDaily = daily !== String(user.dailyStudyMinutes);
  const dirtyDate = examDate !== (user.examDate ? user.examDate.slice(0, 10) : '');

  const saveProfile = () => {
    updateUser({
      name: dirtyName ? name.trim() : user.name,
      dailyStudyMinutes: dirtyDaily ? Math.max(10, Math.min(240, parseInt(daily, 10) || 60)) : user.dailyStudyMinutes,
      examDate: dirtyDate && examDate ? new Date(examDate).toISOString() : user.examDate,
    });
    toast.success('Profile saved');
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Profile, preferences and your study plan." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" /> Profile
          </CardTitle>
          <CardDescription>Keep your exam details up to date so the plan stays accurate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={dirtyName ? name : user.name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Daily study target (minutes)</Label>
              <Input type="number" min={10} max={240} value={dirtyDaily ? daily : String(user.dailyStudyMinutes)} onChange={(e) => setDaily(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Current level</Label>
              <Select
                value={user.currentLevel}
                onValueChange={(v) => updateUser({ currentLevel: v as CefrLevel })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target level</Label>
              <Select
                value={user.targetLevel}
                onValueChange={(v) => updateUser({ targetLevel: v as CefrLevel })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Exam type</Label>
              <Select value={user.examType} onValueChange={(v) => updateUser({ examType: v as ExamType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Exam date</Label>
              <Input type="date" value={dirtyDate ? examDate : user.examDate.slice(0, 10)} onChange={(e) => setExamDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={!dirtyName && !dirtyDaily && !dirtyDate}>
            Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTheme(t.value);
                  updateSettings({ theme: t.value as 'light' | 'dark' | 'system' });
                }}
                className={
                  theme === t.value
                    ? 'inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-foreground'
                    : 'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent'
                }
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Exam mode</p>
              <p className="text-xs text-muted-foreground">Strict timers and no hints during practice.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ examMode: !db.settings.examMode })}
              className={
                db.settings.examMode
                  ? 'relative h-6 w-11 rounded-full bg-primary'
                  : 'relative h-6 w-11 rounded-full bg-muted'
              }
            >
              <span
                className={
                  db.settings.examMode
                    ? 'absolute left-[calc(100%-20px)] top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all'
                    : 'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all'
                }
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Sound effects</p>
              <p className="text-xs text-muted-foreground">Play sounds on correct answers and completions.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ sound: !db.settings.sound })}
              className={
                db.settings.sound
                  ? 'relative h-6 w-11 rounded-full bg-primary'
                  : 'relative h-6 w-11 rounded-full bg-muted'
              }
            >
              <span
                className={
                  db.settings.sound
                    ? 'absolute left-[calc(100%-20px)] top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all'
                    : 'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all'
                }
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-500/30">
        <CardHeader>
          <CardTitle className="text-rose-600 dark:text-rose-400">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Reset deletes all progress, plan, vocabulary, mock exams and applications.
          </p>
          {!confirmReset ? (
            <Button variant="destructive" onClick={() => setConfirmReset(true)}>Reset everything</Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  resetAll();
                  toast.success('All data reset');
                }}
              >
                Yes, reset
              </Button>
              <Button variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
