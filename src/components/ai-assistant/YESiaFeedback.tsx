import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface YESiaFeedbackProps {
  messageId: string;
  onSubmit: (messageId: string, score: number, text?: string) => void;
  className?: string;
}

export function YESiaFeedback({ messageId, onSubmit, className }: YESiaFeedbackProps) {
  const [score, setScore] = useState<number | null>(null);
  const [showText, setShowText] = useState(false);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleScore = (newScore: number) => {
    setScore(newScore);
    if (newScore === 1) {
      onSubmit(messageId, newScore);
      setSubmitted(true);
    } else {
      setShowText(true);
    }
  };

  const handleSubmitText = () => {
    if (score !== null) {
      onSubmit(messageId, score, text || undefined);
      setSubmitted(true);
      setShowText(false);
    }
  };

  if (submitted) {
    return (
      <p className={cn('text-[10px] text-muted-foreground', className)}>
        Obrigado pelo feedback!
      </p>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6', score === 1 && 'text-green-600 bg-green-50')}
          onClick={() => handleScore(1)}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6', score === -1 && 'text-red-600 bg-red-50')}
          onClick={() => handleScore(-1)}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
      {showText && (
        <div className="flex flex-col gap-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="O que poderia melhorar?"
            className="min-h-[50px] text-xs resize-none"
            rows={2}
          />
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => { setShowText(false); setScore(null); }}>
              Cancelar
            </Button>
            <Button size="sm" className="h-6 text-[11px]" onClick={handleSubmitText}>
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default YESiaFeedback;
