import { ZodError } from 'zod';

export class ActionError extends Error {
  constructor(
    public code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'VALIDATION'
      | 'LIMIT_REACHED'
      | 'INTERNAL',
    message: string
  ) {
    super(message);
    this.name = 'ActionError';
  }
}

export function isActionError(e: unknown): e is ActionError {
  return e instanceof ActionError;
}

export function toActionError(e: unknown): { code: string; message: string } {
  if (isActionError(e)) return { code: e.code, message: e.message };
  if (e instanceof ZodError) {
    const msg = e.issues.map((i) => i.message).join('; ');
    return { code: 'VALIDATION', message: msg };
  }
  const message = e instanceof Error ? e.message : 'Something went wrong';
  return { code: 'INTERNAL', message };
}
