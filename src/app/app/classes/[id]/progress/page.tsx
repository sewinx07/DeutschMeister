import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { ClassProgressPanel } from '@/components/app/class-progress-panel';
import { requireOrgContext } from '@/lib/server/org-context';
import { roleHasPermission } from '@/lib/server/rbac';
import { loadClassProgress } from '@/lib/server/class-progress';

export default async function ClassProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();

  const progress = await loadClassProgress(ctx.org.id, id);
  if (!progress) notFound();

  const canView = roleHasPermission(ctx.role, 'class.manage') || progress.teacherId === ctx.user.id;
  if (!canView) notFound();

  const withData = progress.students.filter((s) => s.summary !== null).length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href={`/app/classes/${id}`}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Class
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{progress.subject}</Badge>
          {progress.level && <Badge variant="secondary">{progress.level}</Badge>}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{progress.className}</h1>
        <p className="max-w-2xl text-muted-foreground">
          {progress.courseTitle} · {progress.students.length} enrolled · {withData} with study data
        </p>
      </header>

      <ClassProgressPanel students={progress.students} />
    </div>
  );
}
