import { useState } from 'react';
import { ThumbsUp, ThumbsDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { YESiaMessage as YESiaMessageType, YESiaAction } from '@/types/ai-sales-assistant';

interface YESiaMessageProps {
  message: YESiaMessageType;
  onFeedback?: (messageId: string, score: number) => void;
}

function ActionButton({ action }: { action: YESiaAction }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <Button
      size="sm"
      variant={action.variant === 'destructive' ? 'destructive' : action.variant === 'outline' ? 'outline' : 'secondary'}
      className="h-7 gap-1 text-xs"
      onClick={handleClick}
    >
      {action.label}
      {action.route && <ChevronRight className="h-3 w-3" />}
    </Button>
  );
}

export function YESiaMessage({ message, onFeedback }: YESiaMessageProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<number | null>(
    (message.metadata as any)?.feedback?.score ?? null
  );

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleFeedback = (score: number) => {
    if (feedbackGiven !== null) return;
    setFeedbackGiven(score);
    onFeedback?.(message.id, score);
  };

  return (
    <div
      className={cn(
        'flex w-full px-4 py-1.5',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {/* Agent badge */}
        {isAssistant && message.agent_used && (
          <Badge
            variant="secondary"
            className="mb-1.5 h-5 text-[10px] font-medium"
          >
            {message.agent_used}
          </Badge>
        )}

        {/* Content */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>

        {/* Action buttons */}
        {isAssistant && message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.actions.map((action, idx) => (
              <ActionButton key={idx} action={action} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            'mt-1 text-[10px]',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}
        >
          {new Date(message.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {/* Feedback buttons */}
        {isAssistant && onFeedback && !message.id.startsWith('temp-') && (
          <div className="mt-1 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6',
                feedbackGiven === 1 && 'text-green-600 bg-green-50'
              )}
              onClick={() => handleFeedback(1)}
              disabled={feedbackGiven !== null}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6',
                feedbackGiven === -1 && 'text-red-600 bg-red-50'
              )}
              onClick={() => handleFeedback(-1)}
              disabled={feedbackGiven !== null}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default YESiaMessage;
