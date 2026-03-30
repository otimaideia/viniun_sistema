import { MTDashboardBoardWidget, WidgetData } from '@/types/dashboard';
import { Progress } from '@/components/ui/progress';
import * as LucideIcons from 'lucide-react';

interface WidgetProgressProps {
  widget: MTDashboardBoardWidget;
  data?: WidgetData;
}

export function WidgetProgress({ widget, data }: WidgetProgressProps) {
  const IconComponent = widget.icone
    ? (LucideIcons as any)[widget.icone] || LucideIcons.Target
    : LucideIcons.Target;

  const progress = data?.progress || { current: 0, target: 100, percent: 0 };

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconComponent className="h-4 w-4 text-primary" style={widget.cor ? { color: widget.cor } : undefined} />
          <h3 className="text-sm font-semibold text-foreground">{widget.nome}</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {progress.current} / {progress.target}
        </span>
      </div>
      <Progress value={progress.percent} className="h-3" />
      <p className="text-xs text-muted-foreground mt-2">
        {progress.percent.toFixed(0)}% concluído
      </p>
    </div>
  );
}
