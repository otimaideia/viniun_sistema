import { memo } from 'react';
import { MTDashboardBoardWidget } from '@/types/dashboard';
import { useDashboardWidgetData } from '@/hooks/multitenant/useDashboardWidgetData';
import { WidgetKPI } from './WidgetKPI';
import { WidgetChart } from './WidgetChart';
import { WidgetTable } from './WidgetTable';
import { WidgetProgress } from './WidgetProgress';
import { WidgetFunnel } from './WidgetFunnel';
import { WidgetList } from './WidgetList';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface WidgetRendererProps {
  widget: MTDashboardBoardWidget;
}

export const WidgetRenderer = memo(function WidgetRenderer({ widget }: WidgetRendererProps) {
  const { data, isLoading, error } = useDashboardWidgetData(widget);

  if (isLoading) {
    return (
      <Card className="p-4 h-full">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 h-full flex items-center justify-center text-muted-foreground text-sm">
        Erro ao carregar
      </Card>
    );
  }

  switch (widget.tipo) {
    case 'kpi': return <WidgetKPI widget={widget} data={data} />;
    case 'chart': return <WidgetChart widget={widget} data={data} />;
    case 'funnel': return <WidgetFunnel widget={widget} data={data} />;
    case 'table': return <WidgetTable widget={widget} data={data} />;
    case 'list': return <WidgetList widget={widget} data={data} />;
    case 'progress': return <WidgetProgress widget={widget} data={data} />;
    default:
      return (
        <Card className="p-4 h-full flex items-center justify-center text-muted-foreground text-sm">
          Widget tipo "{widget.tipo}" não suportado
        </Card>
      );
  }
}, (prev, next) => prev.widget.id === next.widget.id);
