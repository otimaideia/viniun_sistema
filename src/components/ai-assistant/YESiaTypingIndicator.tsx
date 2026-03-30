import { cn } from '@/lib/utils';

interface YESiaTypingIndicatorProps {
  className?: string;
}

export function YESiaTypingIndicator({ className }: YESiaTypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 px-4 py-3', className)}>
      <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-2.5">
        <span className="text-sm text-muted-foreground">YESia está pensando</span>
        <div className="flex gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default YESiaTypingIndicator;
