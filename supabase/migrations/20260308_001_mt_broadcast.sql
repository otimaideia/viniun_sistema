-- =============================================================================
-- MULTI-TENANT MIGRATION: Sistema de Broadcast e Grupos em Massa
-- Data: 08/03/2026
-- Descrição: Tabelas para disparo em massa (WAHA + Meta) e adição em massa a grupos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: LISTAS DE BROADCAST
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mt_broadcast_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Origem dos dados
    source_type VARCHAR(30) NOT NULL DEFAULT 'manual',
    -- manual, csv_upload, leads_filter, form_submissions
    source_filter JSONB,

    -- Estatísticas
    total_recipients INTEGER DEFAULT 0,
    valid_numbers INTEGER DEFAULT 0,
    invalid_numbers INTEGER DEFAULT 0,

    -- Compliance
    respect_opt_out BOOLEAN DEFAULT true,

    -- Controle
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES mt_users(id),

    CONSTRAINT mt_broadcast_lists_unique_nome UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_mt_broadcast_lists_tenant ON mt_broadcast_lists(tenant_id);
CREATE INDEX idx_mt_broadcast_lists_franchise ON mt_broadcast_lists(franchise_id);
CREATE INDEX idx_mt_broadcast_lists_deleted ON mt_broadcast_lists(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_broadcast_lists IS 'Listas reutilizáveis de destinatários para broadcast multi-tenant';

-- Destinatários individuais
CREATE TABLE IF NOT EXISTS mt_broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES mt_broadcast_lists(id) ON DELETE CASCADE,

    phone VARCHAR(20) NOT NULL,
    nome VARCHAR(255),
    lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

    -- Validação
    is_valid BOOLEAN DEFAULT true,
    validation_error VARCHAR(255),

    -- Compliance
    opted_out BOOLEAN DEFAULT false,
    opted_out_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_broadcast_recipients_unique UNIQUE(list_id, phone)
);

CREATE INDEX idx_mt_broadcast_recipients_tenant ON mt_broadcast_recipients(tenant_id);
CREATE INDEX idx_mt_broadcast_recipients_list ON mt_broadcast_recipients(list_id);
CREATE INDEX idx_mt_broadcast_recipients_phone ON mt_broadcast_recipients(phone);
CREATE INDEX idx_mt_broadcast_recipients_lead ON mt_broadcast_recipients(lead_id) WHERE lead_id IS NOT NULL;

COMMENT ON TABLE mt_broadcast_recipients IS 'Destinatários individuais em listas de broadcast';

-- -----------------------------------------------------------------------------
-- PARTE 2: CAMPANHAS DE BROADCAST
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mt_broadcast_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Link para campanha de marketing (opcional)
    campaign_id UUID REFERENCES mt_campaigns(id) ON DELETE SET NULL,

    -- Provider
    provider_type VARCHAR(20) NOT NULL,
    -- waha: API não-oficial via WAHA (texto livre)
    -- meta: API oficial Meta Business (templates aprovados)
    session_id UUID REFERENCES mt_whatsapp_sessions(id) ON DELETE SET NULL,
    provider_id UUID,

    -- Conteúdo da mensagem (WAHA)
    message_type VARCHAR(20) DEFAULT 'text',
    -- text, image, video, document, audio
    message_text TEXT,
    media_url TEXT,
    media_filename VARCHAR(255),
    media_mimetype VARCHAR(100),

    -- Template (Meta)
    template_name VARCHAR(255),
    template_language VARCHAR(10) DEFAULT 'pt_BR',
    template_components JSONB,

    -- Destinatários
    list_id UUID REFERENCES mt_broadcast_lists(id) ON DELETE SET NULL,
    total_recipients INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(30) DEFAULT 'draft',
    -- draft, scheduled, processing, paused, completed, failed, cancelled
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,

    -- Rate limiting configurável
    delay_between_messages_ms INTEGER DEFAULT 3000,
    batch_size INTEGER DEFAULT 10,
    max_per_minute INTEGER DEFAULT 15,

    -- Progresso em tempo real
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    opted_out_count INTEGER DEFAULT 0,

    -- Frequency cap
    frequency_cap_hours INTEGER DEFAULT 24,

    -- Resume pattern (checkpoint para edge function)
    last_processed_index INTEGER DEFAULT 0,
    processing_metadata JSONB,

    -- Controle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES mt_users(id),

    CONSTRAINT mt_broadcast_campaigns_check_provider CHECK (
        (provider_type = 'waha' AND session_id IS NOT NULL) OR
        (provider_type = 'meta')
    )
);

CREATE INDEX idx_mt_broadcast_campaigns_tenant ON mt_broadcast_campaigns(tenant_id);
CREATE INDEX idx_mt_broadcast_campaigns_franchise ON mt_broadcast_campaigns(franchise_id);
CREATE INDEX idx_mt_broadcast_campaigns_status ON mt_broadcast_campaigns(status);
CREATE INDEX idx_mt_broadcast_campaigns_deleted ON mt_broadcast_campaigns(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_mt_broadcast_campaigns_scheduled ON mt_broadcast_campaigns(scheduled_at) WHERE status = 'scheduled';

COMMENT ON TABLE mt_broadcast_campaigns IS 'Campanhas de disparo em massa via WAHA ou Meta API';
COMMENT ON COLUMN mt_broadcast_campaigns.provider_type IS 'waha = API não-oficial (texto livre), meta = API oficial (templates)';
COMMENT ON COLUMN mt_broadcast_campaigns.delay_between_messages_ms IS 'Delay entre mensagens em ms (mín 2000 para WAHA)';
COMMENT ON COLUMN mt_broadcast_campaigns.frequency_cap_hours IS 'Não enviar ao mesmo número dentro de X horas';

-- -----------------------------------------------------------------------------
-- PARTE 3: MENSAGENS INDIVIDUAIS DO BROADCAST
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mt_broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    broadcast_campaign_id UUID NOT NULL REFERENCES mt_broadcast_campaigns(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES mt_broadcast_recipients(id) ON DELETE SET NULL,

    phone VARCHAR(20) NOT NULL,
    nome VARCHAR(255),

    -- Entrega
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, sending, sent, delivered, read, failed, opted_out, skipped
    waha_message_id VARCHAR(255),
    meta_message_id VARCHAR(255),

    -- Erro
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 2,

    -- Timestamps
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,

    CONSTRAINT mt_broadcast_messages_unique UNIQUE(broadcast_campaign_id, phone)
);

CREATE INDEX idx_mt_broadcast_messages_tenant ON mt_broadcast_messages(tenant_id);
CREATE INDEX idx_mt_broadcast_messages_campaign ON mt_broadcast_messages(broadcast_campaign_id);
CREATE INDEX idx_mt_broadcast_messages_status ON mt_broadcast_messages(status);
CREATE INDEX idx_mt_broadcast_messages_phone ON mt_broadcast_messages(phone);

COMMENT ON TABLE mt_broadcast_messages IS 'Tracking individual de cada mensagem enviada em broadcast';

-- -----------------------------------------------------------------------------
-- PARTE 4: OPT-OUT GLOBAL
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mt_broadcast_opt_outs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    phone VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    source VARCHAR(30) DEFAULT 'admin',
    -- user_request, reply_stop, admin, complaint

    opted_out_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_broadcast_opt_outs_unique UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_mt_broadcast_opt_outs_tenant ON mt_broadcast_opt_outs(tenant_id);
CREATE INDEX idx_mt_broadcast_opt_outs_phone ON mt_broadcast_opt_outs(phone);

COMMENT ON TABLE mt_broadcast_opt_outs IS 'Registro global de opt-out por tenant para compliance';

-- -----------------------------------------------------------------------------
-- PARTE 5: OPERAÇÕES DE GRUPO EM MASSA
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mt_group_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Sessão e Grupo
    session_id UUID NOT NULL REFERENCES mt_whatsapp_sessions(id) ON DELETE CASCADE,
    session_name VARCHAR(100) NOT NULL,
    group_id VARCHAR(255),
    group_name VARCHAR(255),

    -- Tipo de operação
    operation_type VARCHAR(30) NOT NULL,
    -- create_and_add, add_to_existing, remove_from_group

    -- Origem dos números
    source_type VARCHAR(30) DEFAULT 'manual',
    -- manual, csv, leads, broadcast_list
    list_id UUID REFERENCES mt_broadcast_lists(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, processing, paused, completed, failed, cancelled

    -- Progresso
    total_numbers INTEGER DEFAULT 0,
    added_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    already_member_count INTEGER DEFAULT 0,
    invalid_count INTEGER DEFAULT 0,

    -- Rate limiting
    batch_size INTEGER DEFAULT 5,
    delay_between_batches_ms INTEGER DEFAULT 10000,

    -- Resume pattern
    last_processed_index INTEGER DEFAULT 0,

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES mt_users(id)
);

CREATE INDEX idx_mt_group_operations_tenant ON mt_group_operations(tenant_id);
CREATE INDEX idx_mt_group_operations_session ON mt_group_operations(session_id);
CREATE INDEX idx_mt_group_operations_status ON mt_group_operations(status);

COMMENT ON TABLE mt_group_operations IS 'Operações de adição/remoção em massa de membros em grupos WhatsApp';

-- Items individuais da operação de grupo
CREATE TABLE IF NOT EXISTS mt_group_operation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL REFERENCES mt_group_operations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    phone VARCHAR(20) NOT NULL,
    nome VARCHAR(255),

    status VARCHAR(20) DEFAULT 'pending',
    -- pending, adding, added, failed, already_member, invalid, skipped
    error_message TEXT,

    processed_at TIMESTAMPTZ,

    CONSTRAINT mt_group_operation_items_unique UNIQUE(operation_id, phone)
);

CREATE INDEX idx_mt_group_operation_items_operation ON mt_group_operation_items(operation_id);
CREATE INDEX idx_mt_group_operation_items_status ON mt_group_operation_items(status);

COMMENT ON TABLE mt_group_operation_items IS 'Resultado individual por número em operação de grupo em massa';

-- =============================================================================
-- PARTE 6: ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- mt_broadcast_lists
ALTER TABLE mt_broadcast_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_broadcast_lists_select" ON mt_broadcast_lists FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_lists_insert" ON mt_broadcast_lists FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_broadcast_lists_update" ON mt_broadcast_lists FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_broadcast_lists_delete" ON mt_broadcast_lists FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_broadcast_recipients
ALTER TABLE mt_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_broadcast_recipients_select" ON mt_broadcast_recipients FOR SELECT
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_recipients_insert" ON mt_broadcast_recipients FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_recipients_update" ON mt_broadcast_recipients FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_recipients_delete" ON mt_broadcast_recipients FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_broadcast_campaigns
ALTER TABLE mt_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_broadcast_campaigns_select" ON mt_broadcast_campaigns FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_campaigns_insert" ON mt_broadcast_campaigns FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_broadcast_campaigns_update" ON mt_broadcast_campaigns FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_broadcast_campaigns_delete" ON mt_broadcast_campaigns FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_broadcast_messages
ALTER TABLE mt_broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_broadcast_messages_select" ON mt_broadcast_messages FOR SELECT
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_messages_insert" ON mt_broadcast_messages FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_messages_update" ON mt_broadcast_messages FOR UPDATE
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_messages_delete" ON mt_broadcast_messages FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_broadcast_opt_outs
ALTER TABLE mt_broadcast_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_broadcast_opt_outs_select" ON mt_broadcast_opt_outs FOR SELECT
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_opt_outs_insert" ON mt_broadcast_opt_outs FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_opt_outs_update" ON mt_broadcast_opt_outs FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_broadcast_opt_outs_delete" ON mt_broadcast_opt_outs FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_group_operations
ALTER TABLE mt_group_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_group_operations_select" ON mt_group_operations FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_group_operations_insert" ON mt_group_operations FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_group_operations_update" ON mt_group_operations FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_group_operations_delete" ON mt_group_operations FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_group_operation_items
ALTER TABLE mt_group_operation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_group_operation_items_select" ON mt_group_operation_items FOR SELECT
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_group_operation_items_insert" ON mt_group_operation_items FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_group_operation_items_update" ON mt_group_operation_items FOR UPDATE
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_group_operation_items_delete" ON mt_group_operation_items FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- =============================================================================
-- PARTE 7: REGISTRAR MÓDULO BROADCAST
-- =============================================================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
    'broadcast',
    'Disparo em Massa',
    'Sistema de broadcast via WhatsApp com suporte a WAHA e Meta API oficial',
    'Megaphone',
    'comunicacao',
    14,
    false,
    true
)
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'broadcast'
AND NOT EXISTS (
    SELECT 1 FROM mt_tenant_modules tm
    WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);
