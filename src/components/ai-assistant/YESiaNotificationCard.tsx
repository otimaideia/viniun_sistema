import { X, Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface YESiaNotification {
  id: string;
  result_text?: string;
  result_data?: {
    suggested_actions?: Array<{ label: string; route?: string }>;
  };
  created_at: string;
}

interface YESiaNotificationCardProps {
  notification: YESiaNotification;
  onDismiss: (id: string) => void;
  onAction?: (route: string) => void;
  className?: string;
}

export function YESiaNotificationCard({ notification, onDismiss, onAction, className }: YESiaNotificationCardProps) {
  const actions = notification.result_data?.suggested_actions || [];

  return (
    <Card className={cn('border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950', className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Bell className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">{notification.result_text || 'Nova notificacao'}</p>
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {actions.map((action, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] bg-white dark:bg-gray-900"
                    onClick={() => action.route && onAction?.(action.route)}
                  >
                    {action.label}
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => onDismiss(notification.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default YESiaNotificationCard;
