-- =============================================================================
-- MIGRATION: Notas Internas + Chatbot Integration
-- Data: 14/02/2026
-- =============================================================================

-- ===== PARTE 1: NOTAS INTERNAS =====

CREATE TABLE IF NOT EXISTS mt_whatsapp_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES mt_whatsapp_conversations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    note_type VARCHAR(30) DEFAULT 'general',
    -- general, transfer, important, alert, followup

    is_pinned BOOLEAN DEFAULT false,
    is_private BOOLEAN DEFAULT false,

    created_by UUID NOT NULL REFERENCES mt_users(id),
    created_by_name VARCHAR(255),
    mentioned_users UUID[],

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_whatsapp_notes_conversation ON mt_whatsapp_notes(conversation_id);
CREATE INDEX idx_mt_whatsapp_notes_created_by ON mt_whatsapp_notes(created_by);
CREATE INDEX idx_mt_whatsapp_notes_pinned ON mt_whatsapp_notes(conversation_id, is_pinned) WHERE is_pinned = true;

ALTER TABLE mt_whatsapp_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_whatsapp_notes_select" ON mt_whatsapp_notes FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    created_by = current_user_id() OR
    (is_private = false AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_whatsapp_notes_insert" ON mt_whatsapp_notes FOR INSERT
WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "mt_whatsapp_notes_update" ON mt_whatsapp_notes FOR UPDATE
USING (created_by = current_user_id() OR is_tenant_admin());

CREATE POLICY "mt_whatsapp_notes_delete" ON mt_whatsapp_notes FOR DELETE
USING (created_by = current_user_id() OR is_tenant_admin());

-- ===== PARTE 2: CHATBOT INTEGRATION =====

-- Campos em mt_whatsapp_conversations para chatbot
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS is_bot_active BOOLEAN DEFAULT false;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS requires_human BOOLEAN DEFAULT false;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS bot_transferred_at TIMESTAMPTZ;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS bot_last_response_at TIMESTAMPTZ;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS bot_confidence_score DECIMAL(3,2);
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS bot_attempts INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_bot ON mt_whatsapp_conversations(is_bot_active);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_human ON mt_whatsapp_conversations(requires_human);

-- Configuração de bot por sessão
CREATE TABLE IF NOT EXISTS mt_whatsapp_bot_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES mt_whatsapp_sessions(id) ON DELETE CASCADE,
    chatbot_config_id UUID REFERENCES mt_chatbot_config(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    is_active BOOLEAN DEFAULT false,

    -- Regras de ativação
    auto_respond BOOLEAN DEFAULT true,
    only_outside_hours BOOLEAN DEFAULT false,
    horario_inicio TIME,
    horario_fim TIME,
    dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}',

    -- Transferência para humano
    transfer_on_keywords TEXT[],
    transfer_after_attempts INTEGER DEFAULT 3,
    transfer_if_low_confidence BOOLEAN DEFAULT true,
    min_confidence_score DECIMAL(3,2) DEFAULT 0.70,

    -- Exceções
    exclude_groups BOOLEAN DEFAULT true,
    exclude_contacts TEXT[],

    -- Mensagens
    welcome_message TEXT,
    transfer_message TEXT DEFAULT 'Vou transferir você para um atendente humano.',
    offline_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_whatsapp_bot_config_unique UNIQUE(session_id)
);

CREATE INDEX idx_mt_whatsapp_bot_config_session ON mt_whatsapp_bot_config(session_id);
CREATE INDEX idx_mt_whatsapp_bot_config_chatbot ON mt_whatsapp_bot_config(chatbot_config_id);

ALTER TABLE mt_whatsapp_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_whatsapp_bot_config_all" ON mt_whatsapp_bot_config
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    tenant_id = current_tenant_id()
);

-- ===== PARTE 3: MÉTRICAS POR ATENDENTE =====

CREATE TABLE IF NOT EXISTS mt_whatsapp_agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES mt_whatsapp_sessions(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES mt_whatsapp_queues(id),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Período
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hour INTEGER,

    -- Volume
    total_conversations INTEGER DEFAULT 0,
    conversations_resolved INTEGER DEFAULT 0,
    conversations_transferred INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,

    -- Tempo (segundos)
    total_online_time INTEGER DEFAULT 0,
    total_busy_time INTEGER DEFAULT 0,
    avg_first_response_time INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0,
    avg_resolution_time INTEGER DEFAULT 0,

    -- Qualidade
    satisfaction_score DECIMAL(3,2),
    satisfaction_count INTEGER DEFAULT 0,

    -- Eficiência
    concurrent_peak INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_whatsapp_agent_metrics_unique UNIQUE(user_id, session_id, date, hour)
);

CREATE INDEX idx_mt_whatsapp_agent_metrics_user_date ON mt_whatsapp_agent_metrics(user_id, date DESC);
CREATE INDEX idx_mt_whatsapp_agent_metrics_queue_date ON mt_whatsapp_agent_metrics(queue_id, date DESC);

ALTER TABLE mt_whatsapp_agent_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_whatsapp_agent_metrics_select" ON mt_whatsapp_agent_metrics FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    user_id = current_user_id()
);

-- ===== PARTE 4: CAMPOS ADICIONAIS EM MENSAGENS =====

ALTER TABLE mt_whatsapp_messages ADD COLUMN IF NOT EXISTS sent_by_user_id UUID REFERENCES mt_users(id);
ALTER TABLE mt_whatsapp_messages ADD COLUMN IF NOT EXISTS sent_by_user_name VARCHAR(255);
ALTER TABLE mt_whatsapp_messages ADD COLUMN IF NOT EXISTS is_bot_message BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_messages_sent_by ON mt_whatsapp_messages(sent_by_user_id);

-- ===== PARTE 5: CAMPOS ADICIONAIS EM SESSÕES =====

ALTER TABLE mt_whatsapp_sessions ADD COLUMN IF NOT EXISTS allow_multi_user BOOLEAN DEFAULT false;
ALTER TABLE mt_whatsapp_sessions ADD COLUMN IF NOT EXISTS show_sender_name BOOLEAN DEFAULT true;
ALTER TABLE mt_whatsapp_sessions ADD COLUMN IF NOT EXISTS sender_name_format VARCHAR(50) DEFAULT 'full';
ALTER TABLE mt_whatsapp_sessions ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES mt_users(id);
ALTER TABLE mt_whatsapp_sessions ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES mt_departments(id);
ALTER TABLE mt_whatsapp_sessions ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES mt_teams(id);

CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_sessions_responsible ON mt_whatsapp_sessions(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_sessions_department ON mt_whatsapp_sessions(department_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_sessions_team ON mt_whatsapp_sessions(team_id);
