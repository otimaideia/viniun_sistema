import { MTDashboardBoardWidget, WidgetData } from '@/types/dashboard';
import * as LucideIcons from 'lucide-react';

interface WidgetListProps {
  widget: MTDashboardBoardWidget;
  data?: WidgetData;
}

export function WidgetList({ widget, data }: WidgetListProps) {
  const items = data?.items || [];
  const IconComponent = widget.icone
    ? (LucideIcons as any)[widget.icone] || LucideIcons.List
    : LucideIcons.List;

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <IconComponent className="h-4 w-4 text-primary" style={widget.cor ? { color: widget.cor } : undefined} />
        <h3 className="text-sm font-semibold text-foreground">{widget.nome}</h3>
        {items.length > 0 && (
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{items.length}</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum item</p>
      ) : (
        <div className="space-y-2 overflow-auto max-h-[calc(100%-2.5rem)]">
          {items.slice(0, widget.query_config.limit || 10).map((item, i) => (
            <div key={item.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.nome || item.name || item.titulo || `Item ${i + 1}`}
                </p>
                {(item.horario || item.created_at) && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.horario || item.created_at).toLocaleString('pt-BR', {
                      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
                    })}
                  </p>
                )}
              </div>
              {item.status && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                  {item.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
