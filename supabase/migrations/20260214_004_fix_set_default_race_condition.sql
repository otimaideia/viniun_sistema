-- =============================================================================
-- FIX: Race Condition em setAsDefault
-- Data: 14/02/2026
-- =============================================================================

-- Função atômica para definir fila como padrão
-- Garante que apenas UMA fila por sessão seja is_default = true
CREATE OR REPLACE FUNCTION set_queue_as_default(p_queue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_session_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Buscar session_id e tenant_id da fila
    SELECT session_id, tenant_id INTO v_session_id, v_tenant_id
    FROM mt_whatsapp_queues
    WHERE id = p_queue_id
      AND is_active = true;

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'Fila não encontrada ou inativa';
    END IF;

    -- Executar em transação atômica:
    -- 1. Remover is_default de TODAS as filas da mesma sessão
    -- 2. Definir apenas esta como default
    -- Isso garante que não haja race condition

    UPDATE mt_whatsapp_queues
    SET is_default = (id = p_queue_id),
        updated_at = NOW()
    WHERE session_id = v_session_id
      AND tenant_id = v_tenant_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_queue_as_default IS 'Define fila como padrão de forma atômica, removendo is_default das outras filas da mesma sessão';
