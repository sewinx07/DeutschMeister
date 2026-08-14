import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasAiCredentials, runLlm } from '@/lib/ai/client';

const BodySchema = z.object({
  system: z.string().min(1),
  user: z.string().min(1),
  maxTokens: z.number().int().min(64).max(4096).optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    body = BodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  if (!hasAiCredentials()) {
    return NextResponse.json(
      { error: 'AI is not configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to run the online coach. Offline coach mode is active in the app.' },
      { status: 501 }
    );
  }

  try {
    const text = await runLlm(body);
    return NextResponse.json({ message: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
