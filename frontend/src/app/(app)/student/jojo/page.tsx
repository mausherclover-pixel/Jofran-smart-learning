'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { jojoApi } from '@/lib/api/jojo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DisplayMessage {
  role: 'student' | 'jojo';
  content: string;
}

const WELCOME: Record<string, string> = {
  default: "Hi! I'm Jojo. Ask me anything about your lessons — reading, writing, math, whatever you're working on today.",
};

export default function JojoChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    jojoApi
      .startConversation()
      .then((c) => setConversationId(c.id))
      .catch(() => toast.error("Couldn't start a conversation with Jojo — try again in a moment."))
      .finally(() => setStarting(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;

    const content = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'student', content }]);
    setSending(true);

    try {
      const { reply } = await jojoApi.sendMessage(conversationId, content);
      setMessages((m) => [...m, { role: 'jojo', content: reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Jojo had trouble replying — try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-2xl flex-col">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">Jojo</h1>
          <p className="text-xs text-muted-foreground">Your AI teacher — every conversation is visible to your teacher and parent</p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
          {starting && <Skeleton className="h-12 w-2/3" />}

          {!starting && messages.length === 0 && (
            <div className="rounded-lg bg-muted px-4 py-3 text-sm text-foreground">{WELCOME.default}</div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  m.role === 'student' ? 'ml-auto bg-secondary text-secondary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                {m.content}
              </motion.div>
            ))}
          </AnimatePresence>

          {sending && <div className="w-fit rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">Jojo is typing…</div>}
          <div ref={bottomRef} />
        </CardContent>

        <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Jojo something…"
            disabled={starting || sending}
          />
          <Button type="submit" size="icon" disabled={starting || sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
