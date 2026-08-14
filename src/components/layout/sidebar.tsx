'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_GROUPS } from './nav-config';
import { useApp } from '@/lib/store/app-store';
import { Settings } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <span className="text-sm font-bold tracking-tight">DM</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          DeutschMeister
        </span>
        <span className="text-[10px] text-muted-foreground">
          Exam + IT Ausbildung
        </span>
      </div>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { db } = useApp();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar lg:flex">
      <div className="flex h-16 items-center border-b px-3">
        <Logo />
      </div>
      <nav className="scrollbar-none flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t p-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
        {db?.user ? (
          <p className="mt-2 px-2.5 text-xs text-muted-foreground">
            {db.user.name} · {db.user.currentLevel} → {db.user.targetLevel}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
