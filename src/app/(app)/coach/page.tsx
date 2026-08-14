'use client';

import { useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-store';
import { coachReply } from '@/lib/ai/coach';
import { todayKey } from '@/lib/db/storage';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'coach';
  text: string;
}

const SUGGESTIONS = [
  'What should I study today?',
  'Am I ready for my exam?',
  'Quiz me on vocabulary',
  'Practice speaking with me',
  'I only have 45 minutes today',
  'Which is my weakest skill?',
  'How am I doing so far?',
  'Why is this grammar wrong?',
];

export default function CoachPage() {
  const { db } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggested = useMemo(() => {
    if (!db) return SUGGESTIONS;
    const base = [...SUGGESTIONS];
    if (db.speakingPrompts.length > 0 && !base.includes('Practice speaking with me')) {
      base.push('Practice speaking with me');
    }
    return base.slice(0, 8);
  }, [db]);

  const send = async (raw?: string) => {
    const message = (raw ?? input).trim();
    if (!message || !db) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: message }]);
    setLoading(true);

    const offline = coachReply({ db, today: todayKey() }, message);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system: `You are a friendly German-learning + IT-Ausbildung coach for a ${db.user?.targetLevel ?? 'B1'} German exam candidate targeting ${db.user?.targetAusbildung ?? 'Fachinformatiker'}. Be concise, encouraging, and concrete. Reply in the user's language.`,
          user: message,
          maxTokens: 512,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => [...m, { role: 'coach', text: data.message }]);
      } else {
        setMessages((m) => [...m, { role: 'coach', text: offline }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'coach', text: offline }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  };

  if (!db) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coach"
        description="Dein Lern-Coach — ask about your plan, readiness, vocabulary or grammar and get instant answers."
      />

      <Card className="flex h-[calc(100vh-16rem)] min-h-96 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-foreground">Hi! I&apos;m your German coach.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask me anything about your exam plan, vocabulary, grammar or motivation.
                </p>
              </div>
              <div className="mt-2 flex max-w-md flex-wrap justify-center gap-2">
                {suggested.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'border bg-muted/40 text-foreground'
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
            }}
            placeholder="Ask your coach…"
            className="flex-1"
          />
          <Button onClick={() => send()} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
