import { cn } from '@/lib/utils';

export function RingProgress({
  value,
  size = 96,
  strokeWidth = 9,
  label,
  sub,
  className,
  colorClass,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: React.ReactNode;
  sub?: string;
  className?: string;
  colorClass?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'stroke-primary transition-[stroke-dashoffset] duration-700 ease-out',
            colorClass
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold tabular-nums text-foreground">{label ?? `${Math.round(value)}%`}</div>
        {sub ? <div className="text-[11px] text-muted-foreground">{sub}</div> : null}
      </div>
    </div>
  );
}
