import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'flat';
  className?: string;
}) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
            {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
          </div>
          {Icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </div>
          ) : null}
        </div>
        {trend ? (
          <span
            className={cn(
              'absolute right-4 top-5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              trend === 'up' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              trend === 'down' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
              trend === 'flat' && 'bg-muted text-muted-foreground'
            )}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
