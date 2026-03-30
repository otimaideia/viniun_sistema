import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardOverlay } from './KanbanCard';
import { useFunilEtapasAdapter } from '@/hooks/useFunilEtapasAdapter';
import { useFunilLeadsByEtapa, useFunilLeadMutations } from '@/hooks/useFunilLeads';
import { useCadenciaBatch } from '@/hooks/multitenant/useCadenciaMT';
import type { FunilEtapa, FunilLeadExpanded, FunilFilters } from '@/types/funil';
import { Loader2 } from 'lucide-react';

interface KanbanBoardProps {
  funilId: string;
  filters?: FunilFilters;
  onOpenDetail?: (lead: FunilLeadExpanded) => void;
  onOpenChat?: (conversaId: string) => void;
  onAddLead?: (etapaId: string) => void;
  onConfigEtapa?: (etapa: FunilEtapa) => void;
  onAssignResponsavel?: (lead: FunilLeadExpanded) => void;
  onEditValor?: (lead: FunilLeadExpanded) => void;
  onRemoveLead?: (lead: FunilLeadExpanded) => void;
  onTransferFunnel?: (lead: FunilLeadExpanded) => void;
}

export function KanbanBoard({
  funilId,
  filters,
  onOpenDetail,
  onOpenChat,
  onAddLead,
  onConfigEtapa,
  onAssignResponsavel,
  onEditValor,
  onRemoveLead,
  onTransferFunnel,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<FunilLeadExpanded | null>(null);
  const [overEtapaId, setOverEtapaId] = useState<string | null>(null);

  const { etapas, isLoading: isLoadingEtapas } = useFunilEtapasAdapter(funilId);
  const { leadsByEtapa: rawLeadsByEtapa, leads, isLoading: isLoadingLeads } = useFunilLeadsByEtapa(funilId, filters);
  const { moveLeadToEtapa } = useFunilLeadMutations();
  const { cadenciaMap } = useCadenciaBatch(funilId);

  // Injetar dados de cadência nos leads
  const leadsByEtapa = useMemo(() => {
    const result: Record<string, FunilLeadExpanded[]> = {};
    for (const [etapaId, etapaLeads] of Object.entries(rawLeadsByEtapa)) {
      result[etapaId] = etapaLeads.map((lead) => {
        const cadencia = cadenciaMap[lead.lead_id];
        if (cadencia) {
          return { ...lead, _cadencia: cadencia } as FunilLeadExpanded;
        }
        return lead;
      });
    }
    return result;
  }, [rawLeadsByEtapa, cadenciaMap]);

  // Configurar sensores do drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínimo de 8px para ativar o drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handlers do drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    setActiveId(id);

    // Encontrar o lead ativo
    const lead = leads.find((l) => l.id === id);
    setActiveLead(lead || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Se está sobre um card, pegar a etapa dele
      // Se está sobre uma coluna, usar o ID diretamente
      const overData = over.data.current;
      if (overData?.type === 'column') {
        setOverEtapaId(over.id as string);
      } else if (overData?.type === 'lead') {
        setOverEtapaId(overData.etapaId);
      }
    } else {
      setOverEtapaId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveLead(null);
    setOverEtapaId(null);

    if (!over) return;

    const funilLeadId = active.id as string;
    const activeData = active.data.current;
    const overData = over.data.current;

    // Determinar a etapa de destino
    let destinationEtapaId: string;
    if (overData?.type === 'column') {
      destinationEtapaId = over.id as string;
    } else if (overData?.type === 'lead') {
      destinationEtapaId = overData.etapaId;
    } else {
      return;
    }

    const sourceEtapaId = activeData?.etapaId as string;

    // Se está na mesma etapa, não fazer nada
    if (sourceEtapaId === destinationEtapaId) return;

    // Mover o lead
    try {
      await moveLeadToEtapa.mutateAsync({
        funilLeadId,
        sourceEtapaId,
        destinationEtapaId,
      });
    } catch (error) {
      console.error('Erro ao mover lead:', error);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveLead(null);
    setOverEtapaId(null);
  };

  // Loading state
  if (isLoadingEtapas || isLoadingLeads) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (etapas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <p className="text-lg font-medium">Nenhuma etapa configurada</p>
        <p className="text-sm">Configure as etapas do funil para começar</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-4" style={{ minHeight: 'calc(100vh - 220px)', height: 'calc(100vh - 220px)' }}>
          {etapas.map((etapa) => (
            <KanbanColumn
              key={etapa.id}
              etapa={etapa}
              leads={leadsByEtapa[etapa.id] || []}
              isOver={overEtapaId === etapa.id}
              onOpenDetail={onOpenDetail}
              onOpenChat={onOpenChat}
              onAddLead={onAddLead}
              onConfigEtapa={onConfigEtapa}
              onAssignResponsavel={onAssignResponsavel}
              onEditValor={onEditValor}
              onRemove={onRemoveLead}
              onTransferFunnel={onTransferFunnel}
            />
          ))}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeLead ? (
          <KanbanCardOverlay lead={activeLead} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
