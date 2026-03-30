-- =============================================================================
-- FIX: Timeout para conversas presas
-- Data: 14/02/2026
-- =============================================================================

-- Função para retornar conversas presas para a fila
CREATE OR REPLACE FUNCTION timeout_stuck_conversations(
    p_timeout_minutes INTEGER DEFAULT 120 -- 2 horas padrão
)
RETURNS TABLE(
    conversation_id UUID,
    assigned_to_user_id UUID,
    queue_id UUID,
    last_message_at TIMESTAMPTZ
) AS $$
DECLARE
    v_timeout_threshold TIMESTAMPTZ;
    v_affected_count INTEGER := 0;
BEGIN
    -- Calcular threshold de timeout
    v_timeout_threshold := NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;

    -- Retornar conversas presas para a fila
    WITH stuck_conversations AS (
        SELECT
            c.id,
            c.assigned_to,
            c.queue_id,
            c.last_message_at,
            c.assigned_from_queue_at
        FROM mt_whatsapp_conversations c
        WHERE
            c.status = 'in_progress'
            AND c.assigned_to IS NOT NULL
            AND c.queue_id IS NOT NULL
            -- Sem mensagens recentes
            AND (
                c.last_message_at IS NULL
                OR c.last_message_at < v_timeout_threshold
            )
            -- Ou sem atividade desde assignment
            AND c.assigned_from_queue_at < v_timeout_threshold
    ),
    updated_conversations AS (
        UPDATE mt_whatsapp_conversations
        SET
            status = 'queued',
            assigned_to = NULL,
            assigned_from_queue_at = NULL,
            locked_by = NULL,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id IN (SELECT id FROM stuck_conversations)
        RETURNING id, (
            SELECT assigned_to FROM stuck_conversations sc WHERE sc.id = mt_whatsapp_conversations.id
        ) AS old_assigned_to, queue_id
    ),
    updated_counters AS (
        UPDATE mt_whatsapp_queue_users qu
        SET
            current_conversations = GREATEST(0, current_conversations - 1),
            updated_at = NOW()
        FROM updated_conversations uc
        WHERE qu.user_id = uc.old_assigned_to
          AND qu.queue_id = uc.queue_id
        RETURNING qu.user_id, qu.queue_id
    )
    SELECT
        sc.id AS conversation_id,
        sc.assigned_to AS assigned_to_user_id,
        sc.queue_id,
        sc.last_message_at
    FROM stuck_conversations sc
    INTO conversation_id, assigned_to_user_id, queue_id, last_message_at;

    GET DIAGNOSTICS v_affected_count = ROW_COUNT;

    RAISE NOTICE 'Timeout: % conversas retornadas para fila após % minutos de inatividade',
        v_affected_count, p_timeout_minutes;

    RETURN QUERY
    SELECT
        sc.id,
        sc.assigned_to,
        sc.queue_id,
        sc.last_message_at
    FROM stuck_conversations sc;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION timeout_stuck_conversations IS
'Retorna conversas "in_progress" sem atividade recente para a fila. Padrão: 120 minutos de timeout. Decrementa current_conversations do agente automaticamente.';

-- Criar índice para otimizar busca de conversas presas
CREATE INDEX IF NOT EXISTS idx_conversations_stuck_timeout
ON mt_whatsapp_conversations(status, last_message_at, assigned_from_queue_at)
WHERE status = 'in_progress' AND assigned_to IS NOT NULL;

-- Adicionar coluna de configuração de timeout na tabela de filas
ALTER TABLE mt_whatsapp_queues
ADD COLUMN IF NOT EXISTS timeout_minutes INTEGER DEFAULT 120;

COMMENT ON COLUMN mt_whatsapp_queues.timeout_minutes IS
'Minutos de inatividade antes de retornar conversa para fila. Padrão: 120 (2 horas)';

-- Nota: Para executar automaticamente, configurar um pg_cron job:
-- SELECT cron.schedule('timeout-stuck-conversations', '*/15 * * * *',
--     $$SELECT timeout_stuck_conversations(120)$$);
