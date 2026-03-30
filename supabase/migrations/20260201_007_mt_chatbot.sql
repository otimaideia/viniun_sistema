-- =============================================================================
-- MULTI-TENANT MIGRATION: Chatbot IA Tables
-- Data: 01/02/2026
-- Descrição: Tabelas do módulo Chatbot IA (CORE)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_chatbot_config: Configuração do chatbot por tenant/franquia
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_chatbot_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(100) NOT NULL DEFAULT 'Assistente Virtual',
    avatar_url TEXT,
    descricao TEXT,

    -- Modelo de IA
    provider VARCHAR(50) DEFAULT 'openai', -- openai, anthropic, google
    modelo VARCHAR(100) DEFAULT 'gpt-4o-mini',
    api_key_encrypted TEXT,

    -- Personalidade
    personalidade TEXT,
    tom_de_voz VARCHAR(50) DEFAULT 'profissional', -- profissional, amigavel, formal, casual
    idioma VARCHAR(10) DEFAULT 'pt-BR',

    -- Instruções do sistema
    system_prompt TEXT,
    contexto_adicional TEXT,

    -- Configurações de resposta
    max_tokens INTEGER DEFAULT 1000,
    temperature DECIMAL(3, 2) DEFAULT 0.7,

    -- Horários de funcionamento
    ativo_24h BOOLEAN DEFAULT false,
    horario_inicio TIME,
    horario_fim TIME,
    dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=dom, 1=seg, ...

    -- Mensagem fora do horário
    mensagem_fora_horario TEXT,

    -- Transferência para humano
    permite_transferencia BOOLEAN DEFAULT true,
    transferir_apos_tentativas INTEGER DEFAULT 3,
    mensagem_transferencia TEXT,

    -- Integrações
    integrado_whatsapp BOOLEAN DEFAULT true,
    integrado_site BOOLEAN DEFAULT false,
    whatsapp_session_id UUID,

    -- Métricas
    total_conversas INTEGER DEFAULT 0,
    total_mensagens INTEGER DEFAULT 0,
    taxa_resolucao DECIMAL(5, 2) DEFAULT 0,
    tempo_medio_resposta_ms INTEGER DEFAULT 0,

    -- Controle
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT mt_chatbot_config_unique UNIQUE(tenant_id, franchise_id)
);

COMMENT ON TABLE mt_chatbot_config IS 'Configuração do Chatbot IA por tenant/franquia';

CREATE INDEX IF NOT EXISTS idx_mt_chatbot_config_tenant ON mt_chatbot_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_config_franchise ON mt_chatbot_config(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_config_active ON mt_chatbot_config(tenant_id, is_active);

-- -----------------------------------------------------------------------------
-- mt_chatbot_knowledge: Base de conhecimento do chatbot
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_chatbot_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES mt_chatbot_config(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Categorização
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    tags TEXT[],

    -- Conteúdo
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    resumo TEXT,

    -- Tipo
    tipo VARCHAR(50) DEFAULT 'faq', -- faq, documento, procedimento, produto, servico

    -- Fonte
    fonte VARCHAR(255),
    fonte_url TEXT,

    -- Embedding para busca semântica
    embedding VECTOR(1536),

    -- Prioridade (maior = mais relevante)
    prioridade INTEGER DEFAULT 0,

    -- Uso
    uso_count INTEGER DEFAULT 0,
    ultimo_uso TIMESTAMPTZ,

    -- Controle
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_chatbot_knowledge IS 'Base de conhecimento para respostas do chatbot';

CREATE INDEX IF NOT EXISTS idx_mt_chatbot_knowledge_config ON mt_chatbot_knowledge(config_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_knowledge_tenant ON mt_chatbot_knowledge(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_knowledge_categoria ON mt_chatbot_knowledge(categoria);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_knowledge_tipo ON mt_chatbot_knowledge(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_knowledge_active ON mt_chatbot_knowledge(config_id, is_active);

-- -----------------------------------------------------------------------------
-- mt_chatbot_intents: Intenções reconhecidas pelo chatbot
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_chatbot_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES mt_chatbot_config(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Exemplos de frases (para treinamento)
    exemplos TEXT[] NOT NULL DEFAULT '{}',

    -- Ação a executar
    acao VARCHAR(50), -- responder, transferir, agendar, consultar_lead, criar_lead
    acao_config JSONB DEFAULT '{}',

    -- Resposta padrão
    resposta_padrao TEXT,

    -- Prioridade
    prioridade INTEGER DEFAULT 0,

    -- Métricas
    vezes_detectada INTEGER DEFAULT 0,

    -- Controle
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_chatbot_intents IS 'Intenções configuradas para o chatbot';

CREATE INDEX IF NOT EXISTS idx_mt_chatbot_intents_config ON mt_chatbot_intents(config_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_intents_tenant ON mt_chatbot_intents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_intents_acao ON mt_chatbot_intents(acao);

-- -----------------------------------------------------------------------------
-- mt_chatbot_conversations: Conversas do chatbot
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES mt_chatbot_config(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Origem
    canal VARCHAR(30) NOT NULL, -- whatsapp, site, api
    session_id VARCHAR(255),

    -- WhatsApp
    whatsapp_conversation_id UUID REFERENCES mt_whatsapp_conversations(id) ON DELETE SET NULL,
    whatsapp_chat_id VARCHAR(100),

    -- Contato
    contato_nome VARCHAR(255),
    contato_telefone VARCHAR(20),
    contato_email VARCHAR(255),

    -- Lead vinculado
    lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(30) DEFAULT 'ativa',
    -- ativa, encerrada, transferida, abandonada

    -- Transferência
    transferida BOOLEAN DEFAULT false,
    transferida_para UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    transferida_em TIMESTAMPTZ,
    motivo_transferencia TEXT,

    -- Métricas
    total_mensagens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    tempo_total_segundos INTEGER DEFAULT 0,

    -- Avaliação
    avaliacao INTEGER, -- 1-5
    feedback TEXT,

    -- Resolução
    resolvida BOOLEAN,
    intencao_principal VARCHAR(100),

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_chatbot_conversations IS 'Conversas atendidas pelo chatbot';

CREATE INDEX IF NOT EXISTS idx_mt_chatbot_conversations_config ON mt_chatbot_conversations(config_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_conversations_tenant ON mt_chatbot_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_conversations_lead ON mt_chatbot_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_conversations_status ON mt_chatbot_conversations(status);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_conversations_started ON mt_chatbot_conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_conversations_whatsapp ON mt_chatbot_conversations(whatsapp_conversation_id);

-- -----------------------------------------------------------------------------
-- mt_chatbot_messages: Mensagens do chatbot
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_chatbot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES mt_chatbot_conversations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Remetente
    role VARCHAR(20) NOT NULL, -- user, assistant, system

    -- Conteúdo
    content TEXT NOT NULL,

    -- Tokens usados
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,

    -- Intenção detectada
    intent_id UUID REFERENCES mt_chatbot_intents(id) ON DELETE SET NULL,
    intent_confidence DECIMAL(5, 4),

    -- Knowledge usado
    knowledge_ids UUID[],

    -- Tempo de resposta (para mensagens do assistant)
    response_time_ms INTEGER,

    -- Erro
    error BOOLEAN DEFAULT false,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_chatbot_messages IS 'Mensagens das conversas do chatbot';

CREATE INDEX IF NOT EXISTS idx_mt_chatbot_messages_conversation ON mt_chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_messages_tenant ON mt_chatbot_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_messages_role ON mt_chatbot_messages(role);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_messages_created ON mt_chatbot_messages(created_at DESC);

-- -----------------------------------------------------------------------------
-- mt_chatbot_analytics: Métricas agregadas do chatbot
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_chatbot_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES mt_chatbot_config(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Período
    data DATE NOT NULL,
    hora INTEGER, -- 0-23, NULL para agregação diária

    -- Métricas de volume
    total_conversas INTEGER DEFAULT 0,
    total_mensagens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,

    -- Métricas de qualidade
    conversas_resolvidas INTEGER DEFAULT 0,
    conversas_transferidas INTEGER DEFAULT 0,
    conversas_abandonadas INTEGER DEFAULT 0,

    -- Tempo
    tempo_medio_resposta_ms INTEGER DEFAULT 0,
    tempo_medio_conversa_segundos INTEGER DEFAULT 0,

    -- Avaliações
    total_avaliacoes INTEGER DEFAULT 0,
    soma_avaliacoes INTEGER DEFAULT 0,
    avaliacao_media DECIMAL(3, 2) DEFAULT 0,

    -- Intenções mais frequentes
    intencoes_frequentes JSONB DEFAULT '[]',

    -- Custo estimado
    custo_estimado DECIMAL(10, 4) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_chatbot_analytics_unique UNIQUE(config_id, data, hora)
);

COMMENT ON TABLE mt_chatbot_analytics IS 'Métricas agregadas do chatbot por período';

CREATE INDEX IF NOT EXISTS idx_mt_chatbot_analytics_config ON mt_chatbot_analytics(config_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_analytics_tenant ON mt_chatbot_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_analytics_data ON mt_chatbot_analytics(data DESC);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_analytics_config_data ON mt_chatbot_analytics(config_id, data DESC);

-- -----------------------------------------------------------------------------
-- mt_chatbot_training: Dados de treinamento/feedback
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_chatbot_training (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES mt_chatbot_config(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Mensagem original do usuário
    user_message TEXT NOT NULL,

    -- Resposta dada pelo chatbot
    bot_response TEXT NOT NULL,

    -- Intenção detectada
    detected_intent VARCHAR(100),

    -- Correção humana
    correct_intent VARCHAR(100),
    correct_response TEXT,

    -- Avaliação
    was_helpful BOOLEAN,
    feedback TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, applied
    reviewed_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_chatbot_training IS 'Dados de feedback para melhoria do chatbot';

CREATE INDEX IF NOT EXISTS idx_mt_chatbot_training_config ON mt_chatbot_training(config_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_training_tenant ON mt_chatbot_training(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_training_status ON mt_chatbot_training(status);
CREATE INDEX IF NOT EXISTS idx_mt_chatbot_training_helpful ON mt_chatbot_training(was_helpful);

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trigger_mt_chatbot_config_updated_at
    BEFORE UPDATE ON mt_chatbot_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_chatbot_knowledge_updated_at
    BEFORE UPDATE ON mt_chatbot_knowledge
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_chatbot_intents_updated_at
    BEFORE UPDATE ON mt_chatbot_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_chatbot_conversations_updated_at
    BEFORE UPDATE ON mt_chatbot_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_chatbot_analytics_updated_at
    BEFORE UPDATE ON mt_chatbot_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 007
-- =============================================================================
