import { MTDashboardBoardWidget, WidgetData } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface WidgetKPIProps {
  widget: MTDashboardBoardWidget;
  data?: WidgetData;
}

export function WidgetKPI({ widget, data }: WidgetKPIProps) {
  // Dynamic icon from string name
  const IconComponent = widget.icone
    ? (LucideIcons as any)[widget.icone] || LucideIcons.BarChart3
    : LucideIcons.BarChart3;

  const value = data?.value ?? '-';
  const formattedValue = typeof value === 'number'
    ? (widget.config?.format === 'currency'
        ? `R$ ${value.toLocaleString('pt-BR')}`
        : widget.config?.format === 'percent'
          ? `${value.toFixed(1)}%`
          : value.toLocaleString('pt-BR'))
    : value;

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full transition-all duration-200 hover:shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{widget.nome}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{formattedValue}</p>
          {widget.descricao && (
            <p className="text-xs text-muted-foreground">{widget.descricao}</p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5" style={widget.cor ? { backgroundColor: `${widget.cor}20` } : undefined}>
          <IconComponent className="h-5 w-5 text-primary" style={widget.cor ? { color: widget.cor } : undefined} />
        </div>
      </div>
      {data?.trend && (
        <div className="mt-3 flex items-center gap-1">
          <span className={cn(
            "text-xs font-medium",
            data.trend.positive ? "text-success" : "text-destructive"
          )}>
            {data.trend.positive ? "+" : ""}{data.trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">vs. período anterior</span>
        </div>
      )}
    </div>
  );
}
