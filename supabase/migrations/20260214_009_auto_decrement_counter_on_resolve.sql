-- =============================================================================
-- FIX: Decrementar current_conversations automaticamente ao resolver
-- Data: 14/02/2026
-- =============================================================================

-- Função trigger para decrementar counter quando conversa for resolvida/fechada
CREATE OR REPLACE FUNCTION auto_decrement_conversation_counter()
RETURNS TRIGGER AS $$
BEGIN
    -- Se status mudou para 'resolved' ou 'closed'
    IF (OLD.status IN ('in_progress', 'queued'))
       AND (NEW.status IN ('resolved', 'closed'))
       AND OLD.assigned_to IS NOT NULL
       AND OLD.queue_id IS NOT NULL
    THEN
        -- Decrementar current_conversations do agente
        UPDATE mt_whatsapp_queue_users
        SET
            current_conversations = GREATEST(0, current_conversations - 1),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to
          AND queue_id = OLD.queue_id;

        RAISE NOTICE 'Decrementado counter do agente % na fila % (conversa % resolvida)',
            OLD.assigned_to, OLD.queue_id, NEW.id;
    END IF;

    -- Se conversa foi reatribuída (mudou assigned_to)
    IF (OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NOT NULL)
       AND (OLD.assigned_to != NEW.assigned_to)
       AND (OLD.queue_id IS NOT NULL)
    THEN
        -- Decrementar do agente antigo
        UPDATE mt_whatsapp_queue_users
        SET
            current_conversations = GREATEST(0, current_conversations - 1),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to
          AND queue_id = OLD.queue_id;

        -- Incrementar do novo agente
        UPDATE mt_whatsapp_queue_users
        SET
            current_conversations = current_conversations + 1,
            updated_at = NOW()
        WHERE user_id = NEW.assigned_to
          AND queue_id = OLD.queue_id;

        RAISE NOTICE 'Reatribuída conversa %: % -> %',
            NEW.id, OLD.assigned_to, NEW.assigned_to;
    END IF;

    -- Se assigned_to foi removido (conversa voltou para fila)
    IF (OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL)
       AND (OLD.queue_id IS NOT NULL)
    THEN
        -- Decrementar do agente
        UPDATE mt_whatsapp_queue_users
        SET
            current_conversations = GREATEST(0, current_conversations - 1),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to
          AND queue_id = OLD.queue_id;

        RAISE NOTICE 'Removido assignment da conversa % (agente %)',
            NEW.id, OLD.assigned_to;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela de conversas
DROP TRIGGER IF EXISTS trigger_auto_decrement_counter ON mt_whatsapp_conversations;
CREATE TRIGGER trigger_auto_decrement_counter
    AFTER UPDATE ON mt_whatsapp_conversations
    FOR EACH ROW
    WHEN (
        -- Trigger apenas quando status ou assigned_to mudar
        (OLD.status IS DISTINCT FROM NEW.status)
        OR (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
    )
    EXECUTE FUNCTION auto_decrement_conversation_counter();

COMMENT ON FUNCTION auto_decrement_conversation_counter IS
'Trigger que automaticamente decrementa current_conversations quando:
1. Conversa é resolvida/fechada (status → resolved/closed)
2. Conversa é reatribuída (assigned_to muda)
3. Assignment é removido (assigned_to → NULL)
Garante consistência dos counters sem necessidade de lógica manual no frontend.';

-- =============================================================================
-- FUNÇÃO AUXILIAR: Revalidar todos os counters (caso fiquem inconsistentes)
-- =============================================================================

CREATE OR REPLACE FUNCTION revalidate_all_conversation_counters()
RETURNS TABLE(
    user_id UUID,
    queue_id UUID,
    old_count INTEGER,
    new_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH real_counts AS (
        SELECT
            c.assigned_to AS user_id,
            c.queue_id,
            COUNT(*) AS real_count
        FROM mt_whatsapp_conversations c
        WHERE c.status = 'in_progress'
          AND c.assigned_to IS NOT NULL
          AND c.queue_id IS NOT NULL
        GROUP BY c.assigned_to, c.queue_id
    ),
    updated AS (
        UPDATE mt_whatsapp_queue_users qu
        SET current_conversations = COALESCE(rc.real_count, 0)::INTEGER
        FROM real_counts rc
        WHERE qu.user_id = rc.user_id
          AND qu.queue_id = rc.queue_id
          AND qu.current_conversations != COALESCE(rc.real_count, 0)::INTEGER
        RETURNING
            qu.user_id,
            qu.queue_id,
            qu.current_conversations AS old_count,
            COALESCE(rc.real_count, 0)::INTEGER AS new_count
    )
    SELECT * FROM updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION revalidate_all_conversation_counters IS
'Recalcula e corrige todos os counters de current_conversations baseado no estado real das conversas. Útil se houver inconsistências após bugs ou migrations. Retorna registros corrigidos.';
