import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/server/db';

export type AuditInput = {
  orgId?: string | null;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Append-only audit record. Never throws — logging must not break the caller. */
export async function recordAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: input.orgId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        meta: (input.meta ?? undefined) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch {
    // auditing is best-effort
  }
}
