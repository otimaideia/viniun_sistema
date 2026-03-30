import { useMemo, memo } from 'react';
import { MTDashboardBoardWidget } from '@/types/dashboard';
import { WidgetRenderer } from './widgets/WidgetRenderer';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  widgets: MTDashboardBoardWidget[];
}

function getColSpanClass(span: number): string {
  const map: Record<number, string> = {
    1: 'col-span-12 sm:col-span-6 lg:col-span-1',
    2: 'col-span-12 sm:col-span-6 lg:col-span-2',
    3: 'col-span-12 sm:col-span-6 lg:col-span-3',
    4: 'col-span-12 sm:col-span-6 lg:col-span-4',
    5: 'col-span-12 sm:col-span-6 lg:col-span-5',
    6: 'col-span-12 sm:col-span-6 lg:col-span-6',
    7: 'col-span-12 lg:col-span-7',
    8: 'col-span-12 lg:col-span-8',
    9: 'col-span-12 lg:col-span-9',
    10: 'col-span-12 lg:col-span-10',
    11: 'col-span-12 lg:col-span-11',
    12: 'col-span-12',
  };
  return map[span] || 'col-span-12 sm:col-span-6 lg:col-span-3';
}

function getRowSpanStyle(span: number): React.CSSProperties {
  if (span <= 1) return {};
  return { gridRow: `span ${span}` };
}

// Memoize individual widget cells to prevent re-renders when siblings update
const WidgetCell = memo(function WidgetCell({ widget }: { widget: MTDashboardBoardWidget }) {
  return <WidgetRenderer widget={widget} />;
}, (prev, next) => prev.widget.id === next.widget.id);

export function DashboardGrid({ widgets }: DashboardGridProps) {
  // Memoize sorted/filtered list so it's stable across renders
  const visibleWidgets = useMemo(() => {
    return widgets
      .filter(w => !w._override?.is_hidden)
      .sort((a, b) => {
        const ay = a._override?.posicao_y ?? a.posicao_y;
        const by = b._override?.posicao_y ?? b.posicao_y;
        if (ay !== by) return ay - by;
        const ax = a._override?.posicao_x ?? a.posicao_x;
        const bx = b._override?.posicao_x ?? b.posicao_x;
        if (ax !== bx) return ax - bx;
        return a.ordem - b.ordem;
      });
  }, [widgets]);

  if (!visibleWidgets.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum widget configurado para este board.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {visibleWidgets.map(widget => {
        const largura = widget._override?.largura ?? widget.largura;
        const altura = widget._override?.altura ?? widget.altura;

        return (
          <div
            key={widget.id}
            className={cn(getColSpanClass(largura))}
            style={getRowSpanStyle(altura)}
          >
            <WidgetCell widget={widget} />
          </div>
        );
      })}
    </div>
  );
}
