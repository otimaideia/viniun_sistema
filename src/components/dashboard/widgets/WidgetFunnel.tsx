import { MTDashboardBoardWidget, WidgetData } from '@/types/dashboard';
import { ConversionFunnel } from '../ConversionFunnel';

interface WidgetFunnelProps {
  widget: MTDashboardBoardWidget;
  data?: WidgetData;
}

export function WidgetFunnel({ widget, data }: WidgetFunnelProps) {
  const stages = data?.stages || [];

  if (!stages.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 h-full flex items-center justify-center text-muted-foreground text-sm">
        Sem dados para o funil
      </div>
    );
  }

  return <ConversionFunnel data={stages} className="h-full" />;
}
