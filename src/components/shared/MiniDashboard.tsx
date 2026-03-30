import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface MiniDashboardProps {
  stats: StatItem[];
  className?: string;
}

const colorClasses = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const MiniDashboard: React.FC<MiniDashboardProps> = ({ stats, className }) => {
  return (
    <div className={cn('grid grid-cols-2 gap-4 md:grid-cols-4', className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label || `stat-${index}`} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.trend && (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {stat.trend.isPositive ? '+' : ''}{stat.trend.value}%
                    </p>
                  )}
                </div>
                {Icon && (
                  <div
                    className={cn(
                      'rounded-lg p-2',
                      colorClasses[stat.color || 'default']
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MiniDashboard;
