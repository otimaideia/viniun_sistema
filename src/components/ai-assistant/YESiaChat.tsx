import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Send, X, Minus, BrainCircuit, RotateCcw, Mic } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useYESiaMT } from '@/hooks/multitenant/useYESiaMT';
import { YESiaMessage } from './YESiaMessage';
import { YESiaTypingIndicator } from './YESiaTypingIndicator';
import { YESiaVoiceButton } from './YESiaVoiceButton';

interface YESiaChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Key to track if we already greeted today
const GREETING_KEY = 'yesia-last-greeting';

function hasGreetedToday(): boolean {
  const last = localStorage.getItem(GREETING_KEY);
  if (!last) return false;
  const today = new Date().toISOString().split('T')[0];
  return last === today;
}

function markGreetedToday() {
  localStorage.setItem(GREETING_KEY, new Date().toISOString().split('T')[0]);
}

function getGreetingByTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function YESiaChat({ open, onOpenChange }: YESiaChatProps) {
  const {
    messages,
    isSending,
    isLoadingMessages,
    sendMessage,
    submitFeedback,
    activeConversation,
  } = useYESiaMT();

  const [input, setInput] = useState('');
  const [hasTriggeredGreeting, setHasTriggeredGreeting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isSending]);

  // Focus textarea when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  // AUTO-GREETING: When chat opens with no messages, send a greeting automatically
  useEffect(() => {
    if (!open) return;
    if (hasTriggeredGreeting) return;
    if (isSending) return;
    if (isLoadingMessages) return;

    // Wait a tick to ensure messages are loaded
    const timer = setTimeout(() => {
      if (messages.length === 0 && !hasGreetedToday()) {
        setHasTriggeredGreeting(true);
        markGreetedToday();
        // Send a hidden system greeting that triggers the AI to introduce itself
        const greeting = getGreetingByTime();
        sendMessage(`${greeting}! Me dê um resumo do dia e me ajude com o que preciso fazer.`);
      } else if (messages.length > 0) {
        // Already has messages, don't greet again
        setHasTriggeredGreeting(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [open, messages.length, isSending, isLoadingMessages, hasTriggeredGreeting, sendMessage]);

  // Reset greeting trigger when chat closes
  useEffect(() => {
    if (!open) {
      setHasTriggeredGreeting(false);
    }
  }, [open]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    sendMessage(text);
  }, [input, isSending, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    // Clear today's greeting so next open triggers new greeting
    localStorage.removeItem(GREETING_KEY);
    setHasTriggeredGreeting(false);
    // Force reload by clearing active conversation
    window.location.reload();
  };

  // Find the last agent used for the header badge
  const lastAgentUsed = [...messages].reverse().find(m => m.agent_used)?.agent_used;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        {/* Header */}
        <SheetHeader className="flex-none border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <BrainCircuit className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">YESia</SheetTitle>
                {lastAgentUsed && (
                  <Badge variant="secondary" className="mt-0.5 h-4 text-[10px]">
                    {lastAgentUsed}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <YESiaVoiceButton />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNewConversation}
                title="Nova conversa"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onOpenChange(false)}
                title="Minimizar"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onOpenChange(false)}
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden" ref={scrollRef}>
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-0.5 py-3">
              {messages.length === 0 && !isSending && (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <BrainCircuit className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Iniciando conversa...
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <YESiaMessage
                  key={msg.id}
                  message={msg}
                  onFeedback={msg.role === 'assistant' ? submitFeedback : undefined}
                />
              ))}

              {isSending && <YESiaTypingIndicator />}
            </div>
          </ScrollArea>
        </div>

        {/* Input area */}
        <div className="flex-none border-t bg-background p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={isSending}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            YESia pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default YESiaChat;
