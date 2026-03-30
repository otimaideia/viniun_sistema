import { useState, useCallback } from 'react';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { useFunilLeadMutations } from './useFunilLeads';
import type { FunilLeadExpanded, DropResult } from '@/types/funil';

export function useFunilDragDrop() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<FunilLeadExpanded | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const { moveLeadToEtapa, isMoving } = useFunilLeadMutations();

  const handleDragStart = useCallback(
    (event: DragStartEvent, leads: FunilLeadExpanded[]) => {
      const { active } = event;
      const id = active.id as string;
      setActiveId(id);

      // Encontrar o lead ativo
      const lead = leads.find((l) => l.id === id);
      setActiveLead(lead || null);
    },
    []
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setActiveLead(null);
      setOverId(null);

      if (!over) return;

      const funilLeadId = active.id as string;
      const destinationId = over.id as string;

      // Verificar se o destino é uma coluna (etapa) ou outro card
      // Se for outro card, pegamos a etapa dele
      // Se for uma coluna, o ID já é o ID da etapa

      // Como nossos droppables são as colunas (etapas), o over.id é o etapa_id
      const destinationEtapaId = destinationId;

      // Buscar a etapa de origem do lead
      const sourceEtapaId = active.data.current?.etapaId as string;

      // Se está na mesma etapa, não fazer nada
      if (sourceEtapaId === destinationEtapaId) return;

      // Mover o lead
      const dropResult: DropResult = {
        funilLeadId,
        sourceEtapaId,
        destinationEtapaId,
      };

      await moveLeadToEtapa.mutateAsync(dropResult);
    },
    [moveLeadToEtapa]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveLead(null);
    setOverId(null);
  }, []);

  return {
    activeId,
    activeLead,
    overId,
    isMoving,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}

// Utilitários para drag & drop
export function getLeadDragData(lead: FunilLeadExpanded) {
  return {
    id: lead.id,
    etapaId: lead.etapa_id,
    type: 'lead' as const,
  };
}

export function isLeadDraggable(lead: FunilLeadExpanded) {
  // Pode adicionar lógica para bloquear drag em certos casos
  // Ex: lead em etapa final, usuário sem permissão, etc.
  return true;
}
