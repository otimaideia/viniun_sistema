import React from 'react';
import { LucideIcon, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FileX,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}) => {
  const finalAction = action || (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {finalAction && (
        <Button onClick={finalAction.onClick} className="mt-4">
          {finalAction.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
