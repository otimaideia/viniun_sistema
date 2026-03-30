import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Trophy, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { FunilEtapa, FunilLeadExpanded } from '@/types/funil';
import * as LucideIcons from 'lucide-react';

interface KanbanColumnProps {
  etapa: FunilEtapa;
  leads: FunilLeadExpanded[];
  onOpenDetail?: (lead: FunilLeadExpanded) => void;
  onOpenChat?: (conversaId: string) => void;
  onAssignResponsavel?: (lead: FunilLeadExpanded) => void;
  onEditValor?: (lead: FunilLeadExpanded) => void;
  onRemove?: (lead: FunilLeadExpanded) => void;
  onTransferFunnel?: (lead: FunilLeadExpanded) => void;
  onAddLead?: (etapaId: string) => void;
  onConfigEtapa?: (etapa: FunilEtapa) => void;
  isOver?: boolean;
}

export function KanbanColumn({
  etapa,
  leads,
  onOpenDetail,
  onOpenChat,
  onAssignResponsavel,
  onEditValor,
  onRemove,
  onTransferFunnel,
  onAddLead,
  onConfigEtapa,
  isOver = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: etapa.id,
    data: {
      type: 'column',
      etapa,
    },
  });

  // Calcular métricas
  const totalLeads = leads.length;
  const totalValor = leads.reduce((acc, l) => acc + (l.valor_estimado || 0), 0);

  // Formatar valor
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$${(value / 1000).toFixed(0)}k`;
    }
    return `R$${value}`;
  };

  // Obter ícone dinâmico
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
    toPascalCase(etapa.icone)
  ] || LucideIcons.Circle;

  // Cor de fundo baseada no tipo
  const getHeaderBg = () => {
    if (etapa.tipo === 'ganho') return 'bg-green-50 dark:bg-green-950/30';
    if (etapa.tipo === 'perda') return 'bg-red-50 dark:bg-red-950/30';
    return 'bg-muted/30';
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] w-[300px] bg-muted/20 rounded-lg border shrink-0',
        (isOver || isOverDroppable) && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{ height: '100%', maxHeight: '100%' }}
    >
      {/* Header */}
      <div
        className={cn(
          'p-3 rounded-t-lg border-b',
          getHeaderBg()
        )}
        style={{ borderLeftColor: etapa.cor, borderLeftWidth: 4 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded"
              style={{ backgroundColor: `${etapa.cor}20`, color: etapa.cor }}
            >
              {etapa.tipo === 'ganho' ? (
                <Trophy className="h-4 w-4" />
              ) : etapa.tipo === 'perda' ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <IconComponent className="h-4 w-4" />
              )}
            </div>
            <h3 className="font-semibold text-sm">{etapa.nome}</h3>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAddLead?.(etapa.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            {onConfigEtapa && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onConfigEtapa(etapa)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {totalLeads} {totalLeads === 1 ? 'lead' : 'leads'}
          </Badge>
          {totalValor > 0 && (
            <Badge
              variant="outline"
              className="text-xs text-green-600 border-green-200"
            >
              {formatCurrency(totalValor)}
            </Badge>
          )}
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {leads.map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                onOpenDetail={onOpenDetail}
                onOpenChat={onOpenChat}
                onAssignResponsavel={onAssignResponsavel}
                onEditValor={onEditValor}
                onRemove={onRemove}
                onTransferFunnel={onTransferFunnel}
              />
            ))}
          </div>
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum lead</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => onAddLead?.(etapa.id)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar lead
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// Converter nome do ícone para PascalCase
function toPascalCase(str: string | null | undefined): string {
  if (!str) return 'Circle';
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
