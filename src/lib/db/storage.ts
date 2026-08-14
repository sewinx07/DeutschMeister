'use client';

const PREFIX = 'germain:';
const DB_KEY = `${PREFIX}db:v1`;

export function loadDB(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DB_KEY);
  } catch {
    return null;
  }
}

export function saveDB(raw: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(DB_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

export function clearDB(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DB_KEY);
  } catch {
    /* noop */
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function isoDate(d = new Date()): string {
  return d.toISOString();
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60000);
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function diffDays(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86400000);
}

export function formatDate(isoOrKey: string): string {
  const d = new Date(isoOrKey);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(isoOrKey: string): string {
  const d = new Date(isoOrKey);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function weekday(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}
