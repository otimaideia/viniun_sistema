import { useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useYESiaMT } from '@/hooks/multitenant/useYESiaMT';
import { YESiaChat } from './YESiaChat';

export function YESiaWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, config } = useYESiaMT();

  const notificationCount = notifications.length;
  const hasNotifications = notificationCount > 0;

  // Don't render if config says inactive
  if (config && !config.is_active) return null;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105',
            hasNotifications && 'animate-pulse'
          )}
          onClick={() => setIsOpen(true)}
        >
          <BrainCircuit className="h-6 w-6" />
        </Button>

        {/* Notification badge */}
        {hasNotifications && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </Badge>
        )}
      </div>

      {/* Chat panel */}
      <YESiaChat open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

export default YESiaWidget;
