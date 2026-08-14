const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export function hasAiCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export async function runLlm(options: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
        max_tokens: options.maxTokens ?? 1024,
        system: options.system,
        messages: [{ role: 'user', content: options.user }],
      }),
    });
    if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
    const data = await res.json();
    return (data.content?.[0]?.text ?? '').trim();
  }

  if (openaiKey) {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        max_tokens: options.maxTokens ?? 1024,
        messages: [
          { role: 'system', content: options.system },
          { role: 'user', content: options.user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? '').trim();
  }

  throw new Error('No AI credentials configured');
}
