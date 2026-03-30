-- =============================================================================
-- FIX: Reordenação atômica de filas (preparação para feature futura)
-- Data: 14/02/2026
-- =============================================================================

-- Função para reordenar filas atomicamente
-- Garante que todas as atualizações de prioridade acontecem em uma única transação
CREATE OR REPLACE FUNCTION reorder_queues(
    p_queue_priorities JSONB  -- Array de {queue_id: UUID, priority: INTEGER}
)
RETURNS TABLE(
    queue_id UUID,
    old_priority INTEGER,
    new_priority INTEGER
) AS $$
DECLARE
    v_item JSONB;
    v_queue_id UUID;
    v_new_priority INTEGER;
    v_old_priority INTEGER;
BEGIN
    -- Validar input
    IF p_queue_priorities IS NULL OR jsonb_array_length(p_queue_priorities) = 0 THEN
        RAISE EXCEPTION 'Array de prioridades vazio ou nulo';
    END IF;

    -- Iterar sobre array e atualizar priorities
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_queue_priorities)
    LOOP
        v_queue_id := (v_item->>'queue_id')::UUID;
        v_new_priority := (v_item->>'priority')::INTEGER;

        -- Buscar prioridade antiga
        SELECT priority INTO v_old_priority
        FROM mt_whatsapp_queues
        WHERE id = v_queue_id;

        IF v_old_priority IS NULL THEN
            RAISE EXCEPTION 'Fila % não encontrada', v_queue_id;
        END IF;

        -- Atualizar prioridade
        UPDATE mt_whatsapp_queues
        SET
            priority = v_new_priority,
            updated_at = NOW()
        WHERE id = v_queue_id;

        -- Retornar resultado
        RETURN QUERY SELECT v_queue_id, v_old_priority, v_new_priority;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reorder_queues IS
'Reordena múltiplas filas atomicamente em uma única transação.
Recebe array JSON: [{"queue_id": "uuid", "priority": 10}, ...]
Retorna mudanças aplicadas. Garante que todas as atualizações ocorrem ou nenhuma.';

-- =============================================================================
-- EXEMPLO DE USO
-- =============================================================================

-- Reordenar 3 filas de uma vez (exemplo):
-- SELECT * FROM reorder_queues('[
--   {"queue_id": "uuid-1", "priority": 1},
--   {"queue_id": "uuid-2", "priority": 2},
--   {"queue_id": "uuid-3", "priority": 3}
-- ]'::jsonb);

-- =============================================================================
-- FUNÇÃO AUXILIAR: Reordenar filas por array de IDs (ordem implícita)
-- =============================================================================

CREATE OR REPLACE FUNCTION reorder_queues_by_ids(
    p_queue_ids UUID[]  -- Array de queue_ids na ordem desejada
)
RETURNS TABLE(
    queue_id UUID,
    old_priority INTEGER,
    new_priority INTEGER
) AS $$
DECLARE
    v_queue_id UUID;
    v_index INTEGER := 1;
    v_old_priority INTEGER;
BEGIN
    -- Validar input
    IF p_queue_ids IS NULL OR array_length(p_queue_ids, 1) = 0 THEN
        RAISE EXCEPTION 'Array de IDs vazio ou nulo';
    END IF;

    -- Iterar sobre array (índice = prioridade descendente)
    FOREACH v_queue_id IN ARRAY p_queue_ids
    LOOP
        -- Buscar prioridade antiga
        SELECT priority INTO v_old_priority
        FROM mt_whatsapp_queues
        WHERE id = v_queue_id;

        IF v_old_priority IS NULL THEN
            RAISE EXCEPTION 'Fila % não encontrada', v_queue_id;
        END IF;

        -- Atualizar prioridade (maior índice = maior prioridade)
        -- Exemplo: [id1, id2, id3] → id1=3, id2=2, id3=1
        UPDATE mt_whatsapp_queues
        SET
            priority = array_length(p_queue_ids, 1) - v_index + 1,
            updated_at = NOW()
        WHERE id = v_queue_id;

        -- Retornar resultado
        RETURN QUERY SELECT
            v_queue_id,
            v_old_priority,
            array_length(p_queue_ids, 1) - v_index + 1;

        v_index := v_index + 1;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reorder_queues_by_ids IS
'Reordena filas pela ordem do array de IDs.
Primeiro ID = maior prioridade, último = menor prioridade.
Exemplo: reorder_queues_by_ids(ARRAY[id1, id2, id3]) → id1 priority=3, id2=2, id3=1';

-- =============================================================================
-- EXEMPLO DE USO NO FRONTEND (React Hook)
-- =============================================================================

-- import { useMutation } from '@tanstack/react-query';
--
-- const reorderMutation = useMutation({
--   mutationFn: async (orderedIds: string[]) => {
--     const { data, error } = await supabase.rpc('reorder_queues_by_ids', {
--       p_queue_ids: orderedIds
--     });
--     if (error) throw error;
--     return data;
--   },
--   onSuccess: () => {
--     queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queues'] });
--     toast.success('Filas reordenadas');
--   }
-- });
--
-- // Uso com drag-and-drop (react-beautiful-dnd):
-- const onDragEnd = (result) => {
--   const newOrder = reorder(queues, result.source.index, result.destination.index);
--   const orderedIds = newOrder.map(q => q.id);
--   reorderMutation.mutate(orderedIds);
-- };
