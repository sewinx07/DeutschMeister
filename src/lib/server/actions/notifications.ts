'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth-helpers';
import { resolveCurrentOrg } from '@/lib/server/tenant';
import { toActionError } from '@/lib/server/errors';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

/**
 * Marks notifications read for the current user in their current org.
 * Pass `ids` to mark specific ones, or nothing to mark all.
 */
export async function markNotificationsRead(
  input: { ids?: string[] } = {},
): Promise<ActionResult<{ marked: number }>> {
  try {
    const user = await requireUser();
    const data = z.object({ ids: z.array(z.string().min(1)).max(200).optional() }).parse(input);

    const membership = await resolveCurrentOrg(user.id);
    if (!membership) return { ok: true, data: { marked: 0 } };

    const where = {
      orgId: membership.orgId,
      recipientId: user.id,
      readAt: null,
      ...(data.ids?.length ? { id: { in: data.ids } } : {}),
    };

    const result = await prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });

    revalidatePath('/app/notifications');
    return { ok: true, data: { marked: result.count } };
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }
}
