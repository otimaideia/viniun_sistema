-- =============================================================================
-- MIGRATION: Sistema de Transferências WhatsApp
-- Data: 14/02/2026
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_whatsapp_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES mt_whatsapp_conversations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Transferência
    from_user_id UUID REFERENCES mt_users(id),
    to_user_id UUID REFERENCES mt_users(id),
    from_queue_id UUID REFERENCES mt_whatsapp_queues(id),
    to_queue_id UUID REFERENCES mt_whatsapp_queues(id),

    -- Tipo
    transfer_type VARCHAR(30) NOT NULL,
    -- user_to_user, user_to_queue, queue_to_user, bot_to_user, bot_to_queue

    -- Motivo
    reason TEXT,
    notes TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, accepted, rejected, completed, cancelled

    -- Timestamps
    transferred_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_whatsapp_transfers_conversation ON mt_whatsapp_transfers(conversation_id);
CREATE INDEX idx_mt_whatsapp_transfers_from_user ON mt_whatsapp_transfers(from_user_id);
CREATE INDEX idx_mt_whatsapp_transfers_to_user ON mt_whatsapp_transfers(to_user_id);
CREATE INDEX idx_mt_whatsapp_transfers_status ON mt_whatsapp_transfers(status);
CREATE INDEX idx_mt_whatsapp_transfers_created ON mt_whatsapp_transfers(created_at DESC);

ALTER TABLE mt_whatsapp_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_whatsapp_transfers_select" ON mt_whatsapp_transfers FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    from_user_id = current_user_id() OR
    to_user_id = current_user_id()
);

CREATE POLICY "mt_whatsapp_transfers_insert" ON mt_whatsapp_transfers FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    from_user_id = current_user_id()
);

CREATE POLICY "mt_whatsapp_transfers_update" ON mt_whatsapp_transfers FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    to_user_id = current_user_id()
);

-- Adicionar campos em mt_whatsapp_conversations
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS transferred_from UUID REFERENCES mt_users(id);
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS transfer_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_transferred ON mt_whatsapp_conversations(transferred_from);

-- Função para executar transferência
CREATE OR REPLACE FUNCTION execute_transfer(p_transfer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_transfer RECORD;
    v_conversation_id UUID;
BEGIN
    SELECT * INTO v_transfer
    FROM mt_whatsapp_transfers
    WHERE id = p_transfer_id AND status = 'accepted';

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Transfer not found or not accepted';
    END IF;

    v_conversation_id := v_transfer.conversation_id;

    -- Atualizar conversa baseado no tipo
    IF v_transfer.transfer_type = 'user_to_user' THEN
        UPDATE mt_whatsapp_conversations
        SET assigned_to = v_transfer.to_user_id,
            transferred_from = v_transfer.from_user_id,
            transferred_at = NOW(),
            transfer_count = transfer_count + 1,
            status = 'assigned'
        WHERE id = v_conversation_id;

    ELSIF v_transfer.transfer_type = 'user_to_queue' THEN
        PERFORM add_conversation_to_queue(v_conversation_id, v_transfer.to_queue_id);

        UPDATE mt_whatsapp_conversations
        SET transferred_from = v_transfer.from_user_id,
            transferred_at = NOW(),
            transfer_count = transfer_count + 1
        WHERE id = v_conversation_id;

    ELSIF v_transfer.transfer_type IN ('bot_to_user', 'queue_to_user') THEN
        UPDATE mt_whatsapp_conversations
        SET assigned_to = v_transfer.to_user_id,
            status = 'assigned',
            transferred_at = NOW(),
            transfer_count = transfer_count + 1
        WHERE id = v_conversation_id;
    END IF;

    -- Atualizar status da transferência
    UPDATE mt_whatsapp_transfers
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = p_transfer_id;

    -- Decrementar contador do usuário de origem se aplicável
    IF v_transfer.from_user_id IS NOT NULL THEN
        UPDATE mt_whatsapp_queue_users
        SET current_conversations = GREATEST(0, current_conversations - 1)
        WHERE user_id = v_transfer.from_user_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
