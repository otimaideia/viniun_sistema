-- =============================================================================
-- MULTI-TENANT MIGRATION: Sistema de Filas WhatsApp
-- Data: 14/02/2026
-- Descrição: Sistema completo de filas de atendimento multi-usuário
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: TABELA DE FILAS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mt_whatsapp_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    session_id UUID NOT NULL REFERENCES mt_whatsapp_sessions(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#3B82F6',
    icone VARCHAR(50) DEFAULT 'Users',

    -- Tipo de distribuição
    distribution_type VARCHAR(30) DEFAULT 'round_robin',
    -- round_robin: Revezamento circular
    -- least_busy: Atendente com menos conversas
    -- manual: Atribuição manual pelo supervisor
    -- skill_based: Baseado em habilidades/tags

    -- Limites
    max_concurrent_per_user INTEGER DEFAULT 5,
    auto_assign BOOLEAN DEFAULT true,

    -- Prioridade (maior número = maior prioridade)
    priority INTEGER DEFAULT 0,

    -- SLA (Service Level Agreement)
    first_response_sla_minutes INTEGER DEFAULT 5,
    resolution_sla_minutes INTEGER DEFAULT 60,
    send_sla_alerts BOOLEAN DEFAULT true,

    -- Métricas agregadas
    total_conversations INTEGER DEFAULT 0,
    total_resolved INTEGER DEFAULT 0,
    total_transferred INTEGER DEFAULT 0,
    avg_wait_time_seconds INTEGER DEFAULT 0,
    avg_resolution_time_seconds INTEGER DEFAULT 0,

    -- Horários de funcionamento
    trabalha_24h BOOLEAN DEFAULT false,
    horario_inicio TIME,
    horario_fim TIME,
    dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=domingo, 1=segunda, ...

    -- Mensagens automáticas
    welcome_message TEXT,
    offline_message TEXT,
    queue_message TEXT, -- "Você é o {{position}}º da fila. Aguarde..."

    -- Controle
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES mt_users(id),
    updated_by UUID REFERENCES mt_users(id),

    CONSTRAINT mt_whatsapp_queues_unique_codigo UNIQUE(tenant_id, codigo),
    CONSTRAINT mt_whatsapp_queues_check_horario CHECK (
        (trabalha_24h = true) OR
        (trabalha_24h = false AND horario_inicio IS NOT NULL AND horario_fim IS NOT NULL)
    )
);

COMMENT ON TABLE mt_whatsapp_queues IS 'Filas de atendimento WhatsApp multi-tenant com distribuição automática';
COMMENT ON COLUMN mt_whatsapp_queues.distribution_type IS 'Algoritmo: round_robin, least_busy, manual, skill_based';
COMMENT ON COLUMN mt_whatsapp_queues.first_response_sla_minutes IS 'SLA para primeira resposta em minutos';
COMMENT ON COLUMN mt_whatsapp_queues.resolution_sla_minutes IS 'SLA para resolução completa em minutos';

-- Índices
CREATE INDEX idx_mt_whatsapp_queues_tenant ON mt_whatsapp_queues(tenant_id);
CREATE INDEX idx_mt_whatsapp_queues_franchise ON mt_whatsapp_queues(franchise_id);
CREATE INDEX idx_mt_whatsapp_queues_session ON mt_whatsapp_queues(session_id);
CREATE INDEX idx_mt_whatsapp_queues_active ON mt_whatsapp_queues(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_mt_whatsapp_queues_default ON mt_whatsapp_queues(session_id, is_default) WHERE is_default = true;

-- -----------------------------------------------------------------------------
-- PARTE 2: TABELA DE USUÁRIOS NA FILA
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mt_whatsapp_queue_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES mt_whatsapp_queues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Status do atendente
    status VARCHAR(20) DEFAULT 'available',
    -- available: Disponível para receber conversas
    -- busy: Ocupado mas pode receber
    -- away: Ausente temporariamente
    -- offline: Desconectado

    -- Capacidade
    max_concurrent INTEGER DEFAULT 5,
    current_conversations INTEGER DEFAULT 0,

    -- Skills/Tags (para skill-based routing)
    skills TEXT[], -- ['vendas', 'suporte_tecnico', 'financeiro', 'espanhol']

    -- Prioridade na distribuição (maior = recebe primeiro)
    priority INTEGER DEFAULT 0,

    -- Métricas
    total_assigned INTEGER DEFAULT 0,
    total_resolved INTEGER DEFAULT 0,
    total_transferred_out INTEGER DEFAULT 0,
    avg_resolution_time_seconds INTEGER DEFAULT 0,

    -- Controle
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_whatsapp_queue_users_unique UNIQUE(queue_id, user_id),
    CONSTRAINT mt_whatsapp_queue_users_check_concurrent CHECK (current_conversations >= 0 AND current_conversations <= max_concurrent)
);

COMMENT ON TABLE mt_whatsapp_queue_users IS 'Atendentes vinculados a filas com status e capacidade';
COMMENT ON COLUMN mt_whatsapp_queue_users.status IS 'Status: available, busy, away, offline';
COMMENT ON COLUMN mt_whatsapp_queue_users.skills IS 'Tags de habilidades para roteamento inteligente';

-- Índices
CREATE INDEX idx_mt_whatsapp_queue_users_queue ON mt_whatsapp_queue_users(queue_id);
CREATE INDEX idx_mt_whatsapp_queue_users_user ON mt_whatsapp_queue_users(user_id);
CREATE INDEX idx_mt_whatsapp_queue_users_status ON mt_whatsapp_queue_users(queue_id, status) WHERE is_active = true;
CREATE INDEX idx_mt_whatsapp_queue_users_available ON mt_whatsapp_queue_users(queue_id, current_conversations)
    WHERE status = 'available' AND is_active = true;

-- -----------------------------------------------------------------------------
-- PARTE 3: ALTERAÇÕES EM mt_whatsapp_conversations
-- -----------------------------------------------------------------------------

-- Adicionar campos de fila
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS queue_id UUID REFERENCES mt_whatsapp_queues(id) ON DELETE SET NULL;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS queue_position INTEGER;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS entered_queue_at TIMESTAMPTZ;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS assigned_from_queue_at TIMESTAMPTZ;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS wait_time_seconds INTEGER;

-- Adicionar campos de lock (para evitar conflito de atendentes)
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES mt_users(id) ON DELETE SET NULL;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE mt_whatsapp_conversations ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ;

-- Atualizar enum de status para novos valores
-- Remover constraint antiga se existir
ALTER TABLE mt_whatsapp_conversations DROP CONSTRAINT IF EXISTS mt_whatsapp_conversations_status_check;

-- Status possíveis:
-- 'new' - Novo, não atribuído
-- 'queued' - Na fila aguardando atendente
-- 'assigned' - Atribuído mas não iniciado
-- 'in_progress' - Em atendimento ativo
-- 'waiting_customer' - Aguardando resposta do cliente
-- 'waiting_internal' - Aguardando ação interna
-- 'resolved' - Resolvido
-- 'closed' - Fechado
-- 'archived' - Arquivado

ALTER TABLE mt_whatsapp_conversations
    ADD CONSTRAINT mt_whatsapp_conversations_status_check
    CHECK (status IN ('new', 'queued', 'assigned', 'in_progress', 'waiting_customer', 'waiting_internal', 'resolved', 'closed', 'archived', 'open', 'pending'));

COMMENT ON COLUMN mt_whatsapp_conversations.queue_id IS 'Fila em que a conversa está';
COMMENT ON COLUMN mt_whatsapp_conversations.queue_position IS 'Posição na fila (1 = primeiro)';
COMMENT ON COLUMN mt_whatsapp_conversations.locked_by IS 'Usuário que travou a conversa (evita conflito)';
COMMENT ON COLUMN mt_whatsapp_conversations.lock_expires_at IS 'Lock expira após 30s de inatividade';

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_queue ON mt_whatsapp_conversations(queue_id, queue_position) WHERE queue_position IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_queued ON mt_whatsapp_conversations(queue_id, entered_queue_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_locked ON mt_whatsapp_conversations(locked_by, locked_at) WHERE locked_by IS NOT NULL;

-- -----------------------------------------------------------------------------
-- PARTE 4: FUNÇÃO DE DISTRIBUIÇÃO AUTOMÁTICA
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assign_conversation_from_queue(p_conversation_id UUID)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
    v_distribution_type VARCHAR(30);
    v_assigned_user_id UUID;
    v_queue_user_record RECORD;
BEGIN
    -- Buscar conversa e fila
    SELECT queue_id, q.distribution_type INTO v_queue_id, v_distribution_type
    FROM mt_whatsapp_conversations c
    INNER JOIN mt_whatsapp_queues q ON c.queue_id = q.id
    WHERE c.id = p_conversation_id
      AND c.status = 'queued';

    IF v_queue_id IS NULL THEN
        RAISE EXCEPTION 'Conversa não está na fila ou não encontrada';
    END IF;

    -- Selecionar usuário baseado no tipo de distribuição
    IF v_distribution_type = 'round_robin' THEN
        -- Round Robin: Pega o próximo disponível na ordem
        SELECT user_id INTO v_assigned_user_id
        FROM mt_whatsapp_queue_users
        WHERE queue_id = v_queue_id
          AND status = 'available'
          AND is_active = true
          AND current_conversations < max_concurrent
        ORDER BY last_activity_at ASC NULLS FIRST, created_at ASC
        LIMIT 1;

    ELSIF v_distribution_type = 'least_busy' THEN
        -- Least Busy: Atendente com menos conversas
        SELECT user_id INTO v_assigned_user_id
        FROM mt_whatsapp_queue_users
        WHERE queue_id = v_queue_id
          AND status = 'available'
          AND is_active = true
          AND current_conversations < max_concurrent
        ORDER BY current_conversations ASC, priority DESC
        LIMIT 1;

    ELSIF v_distribution_type = 'skill_based' THEN
        -- Skill-based: Baseado em tags (implementação futura)
        -- Por enquanto, fallback para least_busy
        SELECT user_id INTO v_assigned_user_id
        FROM mt_whatsapp_queue_users
        WHERE queue_id = v_queue_id
          AND status = 'available'
          AND is_active = true
          AND current_conversations < max_concurrent
        ORDER BY current_conversations ASC, priority DESC
        LIMIT 1;

    ELSE
        -- Manual: Não atribui automaticamente
        RETURN NULL;
    END IF;

    -- Se encontrou usuário disponível, atribuir conversa
    IF v_assigned_user_id IS NOT NULL THEN
        -- Atualizar conversa
        UPDATE mt_whatsapp_conversations
        SET assigned_to = v_assigned_user_id,
            assigned_at = NOW(),
            assigned_from_queue_at = NOW(),
            status = 'assigned',
            queue_position = NULL,
            wait_time_seconds = EXTRACT(EPOCH FROM (NOW() - entered_queue_at))::INTEGER
        WHERE id = p_conversation_id;

        -- Incrementar contador do atendente
        UPDATE mt_whatsapp_queue_users
        SET current_conversations = current_conversations + 1,
            total_assigned = total_assigned + 1,
            last_activity_at = NOW()
        WHERE queue_id = v_queue_id
          AND user_id = v_assigned_user_id;

        -- Reordenar posições na fila
        UPDATE mt_whatsapp_conversations c
        SET queue_position = subq.new_position
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY entered_queue_at ASC) as new_position
            FROM mt_whatsapp_conversations
            WHERE queue_id = v_queue_id
              AND status = 'queued'
        ) subq
        WHERE c.id = subq.id;
    END IF;

    RETURN v_assigned_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_conversation_from_queue IS 'Atribui conversa da fila para atendente disponível baseado no algoritmo configurado';

-- -----------------------------------------------------------------------------
-- PARTE 5: FUNÇÃO PARA ADICIONAR CONVERSA NA FILA
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION add_conversation_to_queue(
    p_conversation_id UUID,
    p_queue_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_position INTEGER;
    v_auto_assign BOOLEAN;
BEGIN
    -- Buscar se fila tem auto-assign
    SELECT auto_assign INTO v_auto_assign
    FROM mt_whatsapp_queues
    WHERE id = p_queue_id
      AND is_active = true;

    IF v_auto_assign IS NULL THEN
        RAISE EXCEPTION 'Fila não encontrada ou inativa';
    END IF;

    -- Calcular posição na fila
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_position
    FROM mt_whatsapp_conversations
    WHERE queue_id = p_queue_id
      AND status = 'queued';

    -- Atualizar conversa
    UPDATE mt_whatsapp_conversations
    SET queue_id = p_queue_id,
        queue_position = v_position,
        entered_queue_at = NOW(),
        status = 'queued',
        assigned_to = NULL,
        assigned_at = NULL
    WHERE id = p_conversation_id;

    -- Se auto_assign = true, tentar atribuir imediatamente
    IF v_auto_assign THEN
        PERFORM assign_conversation_from_queue(p_conversation_id);
    END IF;

    RETURN v_position;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_conversation_to_queue IS 'Adiciona conversa na fila e tenta atribuir automaticamente se configurado';

-- -----------------------------------------------------------------------------
-- PARTE 6: FUNÇÃO PARA EXPIRAR LOCKS DE CONVERSA
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION expire_conversation_locks()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Expirar locks mais antigos que 30 segundos
    UPDATE mt_whatsapp_conversations
    SET locked_by = NULL,
        locked_at = NULL,
        lock_expires_at = NULL
    WHERE lock_expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_conversation_locks IS 'Expira locks de conversa após 30 segundos de inatividade';

-- -----------------------------------------------------------------------------
-- PARTE 7: TRIGGER PARA UPDATED_AT
-- -----------------------------------------------------------------------------

CREATE TRIGGER trigger_mt_whatsapp_queues_updated_at
    BEFORE UPDATE ON mt_whatsapp_queues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_whatsapp_queue_users_updated_at
    BEFORE UPDATE ON mt_whatsapp_queue_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- PARTE 8: ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

-- Habilitar RLS
ALTER TABLE mt_whatsapp_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_whatsapp_queue_users ENABLE ROW LEVEL SECURITY;

-- Policies para mt_whatsapp_queues
CREATE POLICY "mt_whatsapp_queues_select" ON mt_whatsapp_queues FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    tenant_id = current_tenant_id()
);

CREATE POLICY "mt_whatsapp_queues_insert" ON mt_whatsapp_queues FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_whatsapp_queues_update" ON mt_whatsapp_queues FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_whatsapp_queues_delete" ON mt_whatsapp_queues FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- Policies para mt_whatsapp_queue_users
CREATE POLICY "mt_whatsapp_queue_users_select" ON mt_whatsapp_queue_users FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    user_id = current_user_id()
);

CREATE POLICY "mt_whatsapp_queue_users_insert" ON mt_whatsapp_queue_users FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_whatsapp_queue_users_update" ON mt_whatsapp_queue_users FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    user_id = current_user_id()
);

CREATE POLICY "mt_whatsapp_queue_users_delete" ON mt_whatsapp_queue_users FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- -----------------------------------------------------------------------------
-- PARTE 9: VIEW AUXILIAR PARA DASHBOARD
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_whatsapp_queue_stats AS
SELECT
    q.id AS queue_id,
    q.nome AS queue_nome,
    q.tenant_id,
    q.session_id,

    -- Contadores
    COUNT(DISTINCT qu.user_id) FILTER (WHERE qu.is_active = true) AS total_agents,
    COUNT(DISTINCT qu.user_id) FILTER (WHERE qu.status = 'available' AND qu.is_active = true) AS available_agents,
    COUNT(DISTINCT qu.user_id) FILTER (WHERE qu.status = 'busy' AND qu.is_active = true) AS busy_agents,

    -- Conversas
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'queued') AS queued_conversations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'in_progress') AS active_conversations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'resolved' AND c.assigned_from_queue_at > NOW() - INTERVAL '1 day') AS resolved_today,

    -- Tempos médios (últimas 24h)
    AVG(c.wait_time_seconds) FILTER (WHERE c.assigned_from_queue_at > NOW() - INTERVAL '1 day') AS avg_wait_time_seconds,

    -- SLA
    q.first_response_sla_minutes,
    q.resolution_sla_minutes,

    -- Capacidade
    SUM(qu.max_concurrent) FILTER (WHERE qu.is_active = true) AS total_capacity,
    SUM(qu.current_conversations) FILTER (WHERE qu.is_active = true) AS current_load,

    -- Última atualização
    MAX(qu.last_activity_at) AS last_activity_at

FROM mt_whatsapp_queues q
LEFT JOIN mt_whatsapp_queue_users qu ON q.id = qu.queue_id
LEFT JOIN mt_whatsapp_conversations c ON q.id = c.queue_id
WHERE q.is_active = true
GROUP BY q.id, q.nome, q.tenant_id, q.session_id, q.first_response_sla_minutes, q.resolution_sla_minutes;

COMMENT ON VIEW v_whatsapp_queue_stats IS 'Estatísticas em tempo real das filas de atendimento';

-- -----------------------------------------------------------------------------
-- FIM DA MIGRATION
-- -----------------------------------------------------------------------------
