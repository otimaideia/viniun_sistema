-- =============================================================================
-- MULTI-TENANT MIGRATION: Business Tables
-- Data: 01/02/2026
-- Descrição: Tabelas de negócio (leads, funil, agendamentos, formulários, etc)
-- =============================================================================

-- =============================================================================
-- PARTE 1: LEADS E CRM
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_leads: Cadastro completo de leads (80+ campos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- IDENTIFICAÇÃO
    codigo VARCHAR(20),
    nome VARCHAR(255) NOT NULL,
    nome_social VARCHAR(255),
    email VARCHAR(255),

    -- CONTATO (Padrão Internacional +5511999999999)
    telefone VARCHAR(20),
    telefone_secundario VARCHAR(20),
    whatsapp VARCHAR(20),
    whatsapp_validado BOOLEAN DEFAULT false,

    -- DOCUMENTOS
    cpf VARCHAR(14),
    rg VARCHAR(20),
    data_nascimento DATE,
    genero VARCHAR(20),
    estado_civil VARCHAR(30),

    -- ENDEREÇO
    cep VARCHAR(10),
    endereco VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    pais VARCHAR(50) DEFAULT 'Brasil',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- PROFISSIONAL
    profissao VARCHAR(100),
    empresa VARCHAR(255),
    cargo VARCHAR(100),
    renda_mensal DECIMAL(12, 2),

    -- INTERESSE
    servico_interesse VARCHAR(255),
    servico_id UUID,
    valor_estimado DECIMAL(12, 2),
    urgencia VARCHAR(20), -- baixa, media, alta, urgente

    -- ORIGEM/TRACKING
    origem VARCHAR(100), -- site, facebook, instagram, google, indicacao, etc
    campanha VARCHAR(255),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    gclid VARCHAR(255),
    fbclid VARCHAR(255),
    referrer_url TEXT,
    landing_page TEXT,

    -- INDICAÇÃO
    indicado_por_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,
    indicado_por_nome VARCHAR(255),
    codigo_indicacao VARCHAR(50),

    -- INFLUENCIADOR
    influenciador_id UUID,
    influenciador_codigo VARCHAR(50),

    -- PARCERIA
    parceria_id UUID,
    parceria_codigo VARCHAR(50),

    -- QUALIFICAÇÃO
    score INTEGER DEFAULT 0,
    score_automatico INTEGER DEFAULT 0,
    score_manual INTEGER DEFAULT 0,
    temperatura VARCHAR(20) DEFAULT 'frio', -- frio, morno, quente
    qualificado BOOLEAN DEFAULT false,
    qualificado_por UUID,
    qualificado_em TIMESTAMPTZ,

    -- ATRIBUIÇÃO
    atribuido_para UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    atribuido_em TIMESTAMPTZ,
    atribuido_por UUID,

    -- STATUS DO FUNIL
    status VARCHAR(50) DEFAULT 'novo',
    etapa_funil VARCHAR(100),
    funil_id UUID,
    funnel_stage_id UUID,

    -- AGENDAMENTO
    data_agendamento TIMESTAMPTZ,
    confirmado BOOLEAN DEFAULT false,
    compareceu BOOLEAN,
    motivo_nao_comparecimento TEXT,

    -- CONVERSÃO
    convertido BOOLEAN DEFAULT false,
    data_conversao TIMESTAMPTZ,
    valor_conversao DECIMAL(12, 2),
    motivo_perda TEXT,
    concorrente VARCHAR(255),

    -- COMUNICAÇÃO
    ultimo_contato TIMESTAMPTZ,
    proximo_contato TIMESTAMPTZ,
    total_contatos INTEGER DEFAULT 0,
    total_mensagens INTEGER DEFAULT 0,
    total_emails INTEGER DEFAULT 0,
    total_ligacoes INTEGER DEFAULT 0,

    -- WHATSAPP
    whatsapp_chat_id VARCHAR(100),
    whatsapp_session_id UUID,
    ultima_mensagem_whatsapp TIMESTAMPTZ,

    -- FORMULÁRIO
    formulario_id UUID,
    submissao_id UUID,

    -- OBSERVAÇÕES
    observacoes TEXT,
    tags TEXT[],

    -- DADOS EXTRAS (JSONB para flexibilidade)
    dados_extras JSONB DEFAULT '{}',

    -- CONTROLE
    status_geral VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo, spam, duplicado
    duplicado_de UUID REFERENCES mt_leads(id) ON DELETE SET NULL,
    mesclado_em UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

COMMENT ON TABLE mt_leads IS 'Leads do CRM com 80+ campos e tracking completo';

-- Índices principais
CREATE INDEX IF NOT EXISTS idx_mt_leads_tenant ON mt_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_leads_franchise ON mt_leads(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_leads_email ON mt_leads(email);
CREATE INDEX IF NOT EXISTS idx_mt_leads_telefone ON mt_leads(telefone);
CREATE INDEX IF NOT EXISTS idx_mt_leads_whatsapp ON mt_leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_mt_leads_cpf ON mt_leads(cpf);
CREATE INDEX IF NOT EXISTS idx_mt_leads_status ON mt_leads(status);
CREATE INDEX IF NOT EXISTS idx_mt_leads_origem ON mt_leads(origem);
CREATE INDEX IF NOT EXISTS idx_mt_leads_atribuido ON mt_leads(atribuido_para);
CREATE INDEX IF NOT EXISTS idx_mt_leads_score ON mt_leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_mt_leads_created ON mt_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_leads_tenant_status ON mt_leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mt_leads_franchise_status ON mt_leads(franchise_id, status);

-- -----------------------------------------------------------------------------
-- mt_lead_activities: Histórico de atividades do lead
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES mt_leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Atividade
    tipo VARCHAR(50) NOT NULL, -- nota, ligacao, email, whatsapp, reuniao, tarefa, status_change
    titulo VARCHAR(255),
    descricao TEXT,

    -- Detalhes específicos por tipo
    dados JSONB DEFAULT '{}',

    -- Comunicação
    direcao VARCHAR(20), -- entrada, saida
    duracao_segundos INTEGER,
    resultado VARCHAR(100),

    -- Status anterior/novo (para mudanças de status)
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),

    -- Usuário
    user_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    user_nome VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_lead_activities IS 'Histórico de todas as atividades e interações com leads';

CREATE INDEX IF NOT EXISTS idx_mt_lead_activities_lead ON mt_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_lead_activities_tenant ON mt_lead_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_lead_activities_tipo ON mt_lead_activities(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_lead_activities_created ON mt_lead_activities(created_at DESC);

-- -----------------------------------------------------------------------------
-- mt_lead_scoring_rules: Regras de Lead Scoring
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50), -- demografico, comportamental, engajamento, temporal

    -- Condição (JSONB para flexibilidade)
    condicao JSONB NOT NULL,
    -- Exemplo: {"campo": "origem", "operador": "equals", "valor": "google"}
    -- Exemplo: {"campo": "renda_mensal", "operador": "greater_than", "valor": 5000}

    -- Pontuação
    pontos INTEGER NOT NULL DEFAULT 0,
    is_bonus BOOLEAN DEFAULT true, -- true = soma, false = subtrai

    -- Controle
    is_active BOOLEAN DEFAULT true,
    prioridade INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_lead_scoring_rules IS 'Regras configuráveis de Lead Scoring por tenant';

CREATE INDEX IF NOT EXISTS idx_mt_lead_scoring_rules_tenant ON mt_lead_scoring_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_lead_scoring_rules_active ON mt_lead_scoring_rules(tenant_id, is_active);

-- =============================================================================
-- PARTE 2: FUNIL DE VENDAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_funnels: Funis de vendas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'vendas', -- vendas, marketing, atendimento, pos_venda

    -- Configuração
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    cor VARCHAR(7) DEFAULT '#3B82F6',
    icone VARCHAR(50),

    -- Métricas
    total_leads INTEGER DEFAULT 0,
    total_convertidos INTEGER DEFAULT 0,
    valor_total DECIMAL(15, 2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_funnels IS 'Funis de vendas customizáveis por tenant/franquia';

CREATE INDEX IF NOT EXISTS idx_mt_funnels_tenant ON mt_funnels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_funnels_franchise ON mt_funnels(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_funnels_default ON mt_funnels(tenant_id, is_default);

-- -----------------------------------------------------------------------------
-- mt_funnel_stages: Etapas do funil
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_funnel_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES mt_funnels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#3B82F6',

    -- Posição
    ordem INTEGER NOT NULL DEFAULT 0,

    -- Tipo
    tipo VARCHAR(20) DEFAULT 'progress', -- entry, progress, won, lost

    -- Automação
    dias_alerta INTEGER, -- Alertar após X dias sem movimentação
    acao_automatica VARCHAR(50), -- enviar_email, atribuir_usuario, criar_tarefa

    -- Métricas
    total_leads INTEGER DEFAULT 0,
    tempo_medio_dias DECIMAL(10, 2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_funnel_stages IS 'Etapas configuráveis de cada funil';

CREATE INDEX IF NOT EXISTS idx_mt_funnel_stages_funnel ON mt_funnel_stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_mt_funnel_stages_ordem ON mt_funnel_stages(funnel_id, ordem);

-- -----------------------------------------------------------------------------
-- mt_funnel_leads: Leads em cada etapa do funil
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_funnel_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES mt_funnels(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES mt_funnel_stages(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES mt_leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Posição no kanban
    posicao INTEGER DEFAULT 0,

    -- Valores
    valor_estimado DECIMAL(12, 2),
    probabilidade INTEGER DEFAULT 50, -- 0-100%

    -- Datas
    entrou_em TIMESTAMPTZ DEFAULT NOW(),
    prazo TIMESTAMPTZ,

    -- Controle
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_funnel_leads_unique UNIQUE(funnel_id, lead_id)
);

COMMENT ON TABLE mt_funnel_leads IS 'Posição dos leads em cada funil/etapa (Kanban)';

CREATE INDEX IF NOT EXISTS idx_mt_funnel_leads_funnel ON mt_funnel_leads(funnel_id);
CREATE INDEX IF NOT EXISTS idx_mt_funnel_leads_stage ON mt_funnel_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_mt_funnel_leads_lead ON mt_funnel_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_funnel_leads_active ON mt_funnel_leads(funnel_id, is_active);

-- =============================================================================
-- PARTE 3: AGENDAMENTOS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_appointments: Agendamentos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,

    -- Lead/Cliente
    lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_telefone VARCHAR(20),
    cliente_email VARCHAR(255),

    -- Serviço
    servico_id UUID,
    servico_nome VARCHAR(255),
    valor DECIMAL(12, 2),

    -- Profissional
    profissional_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    profissional_nome VARCHAR(255),

    -- Data/Hora
    data_agendamento DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME,
    duracao_minutos INTEGER DEFAULT 60,

    -- Status
    status VARCHAR(30) DEFAULT 'agendado',
    -- agendado, confirmado, em_atendimento, concluido, cancelado, nao_compareceu

    -- Confirmação
    confirmado BOOLEAN DEFAULT false,
    confirmado_em TIMESTAMPTZ,
    confirmado_via VARCHAR(20), -- whatsapp, telefone, email, sistema

    -- Check-in
    checkin_em TIMESTAMPTZ,
    checkout_em TIMESTAMPTZ,

    -- Cancelamento
    cancelado_em TIMESTAMPTZ,
    cancelado_por UUID,
    motivo_cancelamento TEXT,

    -- Observações
    observacoes TEXT,
    observacoes_internas TEXT,

    -- Recorrência
    is_recorrente BOOLEAN DEFAULT false,
    recorrencia_id UUID,
    recorrencia_config JSONB,

    -- Origem
    origem VARCHAR(50), -- site, whatsapp, telefone, presencial, sistema

    -- Integração externa
    external_id VARCHAR(100),
    external_source VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_appointments IS 'Agendamentos de consultas e procedimentos';

CREATE INDEX IF NOT EXISTS idx_mt_appointments_tenant ON mt_appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_appointments_franchise ON mt_appointments(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_appointments_lead ON mt_appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_appointments_data ON mt_appointments(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_mt_appointments_status ON mt_appointments(status);
CREATE INDEX IF NOT EXISTS idx_mt_appointments_profissional ON mt_appointments(profissional_id);
CREATE INDEX IF NOT EXISTS idx_mt_appointments_franchise_data ON mt_appointments(franchise_id, data_agendamento);

-- =============================================================================
-- PARTE 4: FORMULÁRIOS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_forms: Formulários de captação
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Configuração visual
    titulo_pagina VARCHAR(255),
    subtitulo TEXT,
    imagem_header TEXT,
    cor_primaria VARCHAR(7) DEFAULT '#3B82F6',
    cor_fundo VARCHAR(7) DEFAULT '#FFFFFF',

    -- Comportamento
    redirect_url TEXT,
    mensagem_sucesso TEXT,
    email_notificacao TEXT[],

    -- Integração
    webhook_url TEXT,
    criar_lead BOOLEAN DEFAULT true,
    funil_id UUID REFERENCES mt_funnels(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    publicado BOOLEAN DEFAULT false,
    publicado_em TIMESTAMPTZ,

    -- Limites
    limite_submissoes INTEGER,
    data_inicio TIMESTAMPTZ,
    data_fim TIMESTAMPTZ,

    -- Analytics
    total_visualizacoes INTEGER DEFAULT 0,
    total_submissoes INTEGER DEFAULT 0,
    taxa_conversao DECIMAL(5, 2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT mt_forms_slug_unique UNIQUE(tenant_id, slug)
);

COMMENT ON TABLE mt_forms IS 'Formulários de captação com builder visual';

CREATE INDEX IF NOT EXISTS idx_mt_forms_tenant ON mt_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_forms_franchise ON mt_forms(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_forms_slug ON mt_forms(slug);
CREATE INDEX IF NOT EXISTS idx_mt_forms_active ON mt_forms(tenant_id, is_active);

-- -----------------------------------------------------------------------------
-- mt_form_fields: Campos do formulário
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES mt_forms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    placeholder VARCHAR(255),
    helper_text TEXT,

    -- Tipo
    tipo VARCHAR(50) NOT NULL,
    -- text, email, phone, number, date, datetime, select, multiselect,
    -- checkbox, radio, textarea, file, rating, signature, cep, cpf, cnpj

    -- Configuração
    obrigatorio BOOLEAN DEFAULT false,
    ordem INTEGER DEFAULT 0,
    largura VARCHAR(20) DEFAULT 'full', -- full, half, third

    -- Validação
    validacao JSONB DEFAULT '{}',
    -- Exemplo: {"min": 3, "max": 100, "pattern": "regex"}

    -- Opções (para select, radio, checkbox)
    opcoes JSONB DEFAULT '[]',
    -- Exemplo: [{"value": "op1", "label": "Opção 1"}]

    -- Valor padrão
    valor_padrao TEXT,

    -- Condicional
    condicao JSONB,
    -- Exemplo: {"campo": "outro_campo", "operador": "equals", "valor": "sim"}

    -- Mapeamento para lead
    mapear_para_lead VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_form_fields IS 'Campos configuráveis do formulário (15+ tipos)';

CREATE INDEX IF NOT EXISTS idx_mt_form_fields_form ON mt_form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_mt_form_fields_ordem ON mt_form_fields(form_id, ordem);

-- -----------------------------------------------------------------------------
-- mt_form_submissions: Submissões do formulário
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES mt_forms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Lead criado
    lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

    -- Dados submetidos
    dados JSONB NOT NULL DEFAULT '{}',

    -- Tracking
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'novo', -- novo, processado, erro, spam

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_form_submissions IS 'Submissões recebidas nos formulários';

CREATE INDEX IF NOT EXISTS idx_mt_form_submissions_form ON mt_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_mt_form_submissions_tenant ON mt_form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_form_submissions_lead ON mt_form_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_form_submissions_created ON mt_form_submissions(created_at DESC);

-- =============================================================================
-- PARTE 5: WHATSAPP
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_whatsapp_sessions: Sessões do WhatsApp
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    session_name VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),

    -- Configuração WAHA
    waha_url TEXT,
    waha_api_key TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, scan_qr, connected, disconnected, failed
    qr_code TEXT,
    last_qr_at TIMESTAMPTZ,

    -- Webhook
    webhook_url TEXT,
    webhook_secret TEXT,

    -- Métricas
    total_chats INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,

    -- Sincronização
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(20),

    -- Controle
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT mt_whatsapp_sessions_unique UNIQUE(tenant_id, session_name)
);

COMMENT ON TABLE mt_whatsapp_sessions IS 'Sessões do WhatsApp Business via WAHA';

CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_sessions_tenant ON mt_whatsapp_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_sessions_franchise ON mt_whatsapp_sessions(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_sessions_status ON mt_whatsapp_sessions(status);

-- -----------------------------------------------------------------------------
-- mt_whatsapp_conversations: Conversas do WhatsApp
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES mt_whatsapp_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Chat ID do WhatsApp
    chat_id VARCHAR(100) NOT NULL,
    is_group BOOLEAN DEFAULT false,

    -- Contato
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_avatar TEXT,

    -- Lead vinculado
    lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'open', -- open, closed, pending, archived
    unread_count INTEGER DEFAULT 0,

    -- Última mensagem
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_from VARCHAR(20), -- me, contact

    -- Atribuição
    assigned_to UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,

    -- Tags
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_whatsapp_conversations_unique UNIQUE(session_id, chat_id)
);

COMMENT ON TABLE mt_whatsapp_conversations IS 'Conversas/chats do WhatsApp';

CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_session ON mt_whatsapp_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_tenant ON mt_whatsapp_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_lead ON mt_whatsapp_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_status ON mt_whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_conversations_last ON mt_whatsapp_conversations(last_message_at DESC);

-- -----------------------------------------------------------------------------
-- mt_whatsapp_messages: Mensagens do WhatsApp
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES mt_whatsapp_conversations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES mt_whatsapp_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- ID do WhatsApp
    message_id VARCHAR(100),

    -- Direção
    from_me BOOLEAN DEFAULT false,
    sender_id VARCHAR(100),
    sender_name VARCHAR(255),

    -- Conteúdo
    tipo VARCHAR(30) DEFAULT 'text',
    -- text, image, video, audio, document, sticker, location, contact, template

    body TEXT,
    caption TEXT,

    -- Mídia
    media_url TEXT,
    media_mimetype VARCHAR(100),
    media_filename VARCHAR(255),
    media_size INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'sent',
    -- pending, sent, delivered, read, failed
    ack INTEGER DEFAULT 0, -- 0=pending, 1=sent, 2=delivered, 3=read

    -- Erro
    error_message TEXT,

    -- Quotação (resposta a mensagem)
    quoted_message_id VARCHAR(100),

    -- Template
    template_id UUID,
    template_name VARCHAR(100),

    -- Timestamps
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_whatsapp_messages IS 'Mensagens enviadas e recebidas no WhatsApp';

CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_messages_conversation ON mt_whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_messages_session ON mt_whatsapp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_messages_tenant ON mt_whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_messages_timestamp ON mt_whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_messages_message_id ON mt_whatsapp_messages(message_id);

-- -----------------------------------------------------------------------------
-- mt_whatsapp_templates: Templates de mensagens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50), -- saudacao, confirmacao, lembrete, promocao, suporte
    descricao TEXT,

    -- Conteúdo
    conteudo TEXT NOT NULL,
    variaveis TEXT[], -- {nome}, {data}, {servico}, etc

    -- Mídia
    tem_midia BOOLEAN DEFAULT false,
    midia_tipo VARCHAR(20),
    midia_url TEXT,

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

COMMENT ON TABLE mt_whatsapp_templates IS 'Templates de mensagens do WhatsApp';

CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_templates_tenant ON mt_whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_templates_categoria ON mt_whatsapp_templates(categoria);
CREATE INDEX IF NOT EXISTS idx_mt_whatsapp_templates_active ON mt_whatsapp_templates(tenant_id, is_active);

-- =============================================================================
-- PARTE 6: SERVIÇOS E CATÁLOGO
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_services: Catálogo de serviços/procedimentos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    nome_curto VARCHAR(100),
    descricao TEXT,
    descricao_curta VARCHAR(500),

    -- Categoria
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),

    -- Preço
    preco DECIMAL(12, 2),
    preco_promocional DECIMAL(12, 2),
    moeda VARCHAR(3) DEFAULT 'BRL',

    -- Duração
    duracao_minutos INTEGER,

    -- Imagem
    imagem_url TEXT,
    galeria JSONB DEFAULT '[]',

    -- Disponibilidade
    disponivel_online BOOLEAN DEFAULT true,
    disponivel_agendamento BOOLEAN DEFAULT true,
    requer_avaliacao BOOLEAN DEFAULT false,

    -- Tags e busca
    tags TEXT[],
    palavras_chave TEXT[],

    -- Controle
    is_active BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    destaque BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_services IS 'Catálogo de serviços/procedimentos oferecidos';

CREATE INDEX IF NOT EXISTS idx_mt_services_tenant ON mt_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_services_categoria ON mt_services(categoria);
CREATE INDEX IF NOT EXISTS idx_mt_services_active ON mt_services(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mt_services_destaque ON mt_services(tenant_id, destaque);

-- =============================================================================
-- PARTE 7: CAMPANHAS E MARKETING
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_campaigns: Campanhas de marketing
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50), -- awareness, lead_gen, conversao, retencao

    -- Período
    data_inicio DATE,
    data_fim DATE,

    -- Orçamento
    budget_planejado DECIMAL(12, 2),
    budget_gasto DECIMAL(12, 2) DEFAULT 0,
    moeda VARCHAR(3) DEFAULT 'BRL',

    -- Canais
    canais TEXT[], -- google, facebook, instagram, whatsapp, email

    -- Métricas
    impressoes INTEGER DEFAULT 0,
    cliques INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    conversoes INTEGER DEFAULT 0,
    valor_conversoes DECIMAL(12, 2) DEFAULT 0,

    -- Calculados
    ctr DECIMAL(5, 2) DEFAULT 0,
    cpl DECIMAL(12, 2) DEFAULT 0,
    cpa DECIMAL(12, 2) DEFAULT 0,
    roas DECIMAL(10, 2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'rascunho',
    -- rascunho, ativa, pausada, encerrada, arquivada

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_campaigns IS 'Campanhas de marketing com métricas e budget';

CREATE INDEX IF NOT EXISTS idx_mt_campaigns_tenant ON mt_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_campaigns_franchise ON mt_campaigns(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_campaigns_status ON mt_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_mt_campaigns_periodo ON mt_campaigns(data_inicio, data_fim);

-- =============================================================================
-- PARTE 8: INFLUENCIADORAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_influencers: Cadastro de influenciadoras
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_influencers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    codigo VARCHAR(50) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    nome_artistico VARCHAR(255),
    email VARCHAR(255),

    -- Contato (Padrão Internacional)
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),

    -- Documentos
    cpf VARCHAR(14),
    data_nascimento DATE,

    -- Endereço
    cidade VARCHAR(100),
    estado VARCHAR(2),

    -- Redes Sociais
    instagram VARCHAR(100),
    instagram_seguidores INTEGER,
    tiktok VARCHAR(100),
    tiktok_seguidores INTEGER,
    youtube VARCHAR(100),
    youtube_inscritos INTEGER,

    -- Nicho
    nichos TEXT[],
    publico_alvo TEXT,

    -- Valores
    valor_post DECIMAL(10, 2),
    valor_story DECIMAL(10, 2),
    valor_reels DECIMAL(10, 2),
    aceita_permuta BOOLEAN DEFAULT true,

    -- Métricas de desempenho
    total_indicacoes INTEGER DEFAULT 0,
    total_conversoes INTEGER DEFAULT 0,
    valor_gerado DECIMAL(12, 2) DEFAULT 0,

    -- Avaliação
    rating DECIMAL(3, 2),
    total_avaliacoes INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo, pendente, bloqueado

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_influencers IS 'Cadastro de influenciadoras digitais';

CREATE INDEX IF NOT EXISTS idx_mt_influencers_tenant ON mt_influencers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_influencers_codigo ON mt_influencers(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_influencers_status ON mt_influencers(status);
CREATE INDEX IF NOT EXISTS idx_mt_influencers_cidade ON mt_influencers(cidade, estado);

-- -----------------------------------------------------------------------------
-- mt_influencer_contracts: Contratos com influenciadoras
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_influencer_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID NOT NULL REFERENCES mt_influencers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Tipo
    tipo VARCHAR(50), -- mensal, por_post, comissao, permuta, misto

    -- Período
    data_inicio DATE NOT NULL,
    data_fim DATE,

    -- Valores
    valor_mensal DECIMAL(10, 2),
    valor_por_post DECIMAL(10, 2),
    percentual_comissao DECIMAL(5, 2),
    valor_comissao_fixa DECIMAL(10, 2),
    credito_permuta DECIMAL(10, 2),

    -- Entregas
    posts_mes INTEGER,
    stories_mes INTEGER,
    reels_mes INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'ativo', -- rascunho, ativo, pausado, encerrado

    -- Documentos
    contrato_url TEXT,
    assinado BOOLEAN DEFAULT false,
    assinado_em TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_influencer_contracts IS 'Contratos e acordos com influenciadoras';

CREATE INDEX IF NOT EXISTS idx_mt_influencer_contracts_influencer ON mt_influencer_contracts(influencer_id);
CREATE INDEX IF NOT EXISTS idx_mt_influencer_contracts_tenant ON mt_influencer_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_influencer_contracts_status ON mt_influencer_contracts(status);

-- =============================================================================
-- PARTE 9: PARCERIAS B2B
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_partnerships: Parcerias empresariais
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    codigo VARCHAR(50) UNIQUE,
    nome_empresa VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18),

    -- Contato
    contato_nome VARCHAR(255),
    contato_cargo VARCHAR(100),
    contato_telefone VARCHAR(20),
    contato_email VARCHAR(255),

    -- Endereço
    cidade VARCHAR(100),
    estado VARCHAR(2),

    -- Tipo de parceria
    tipo VARCHAR(50), -- comercial, permuta, indicacao, franquia
    segmento VARCHAR(100),

    -- Benefícios
    desconto_percentual DECIMAL(5, 2),
    desconto_valor_fixo DECIMAL(10, 2),
    beneficios_extras TEXT,

    -- Métricas
    total_indicacoes INTEGER DEFAULT 0,
    total_conversoes INTEGER DEFAULT 0,
    valor_gerado DECIMAL(12, 2) DEFAULT 0,

    -- QR Code
    qr_code_url TEXT,
    qr_code_acessos INTEGER DEFAULT 0,

    -- Portal
    portal_usuario VARCHAR(100),
    portal_senha_hash TEXT,
    portal_ultimo_acesso TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) DEFAULT 'ativo',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_partnerships IS 'Parcerias empresariais B2B com QR Code e portal';

CREATE INDEX IF NOT EXISTS idx_mt_partnerships_tenant ON mt_partnerships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_partnerships_codigo ON mt_partnerships(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_partnerships_status ON mt_partnerships(status);
CREATE INDEX IF NOT EXISTS idx_mt_partnerships_tipo ON mt_partnerships(tipo);

-- =============================================================================
-- PARTE 10: METAS E OBJETIVOS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_goals: Metas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    user_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    -- Identificação
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50), -- leads, vendas, agendamentos, conversao, receita

    -- Período
    periodo VARCHAR(20), -- diario, semanal, mensal, trimestral, anual
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,

    -- Meta
    meta_valor DECIMAL(15, 2) NOT NULL,
    meta_unidade VARCHAR(50), -- unidades, reais, percentual

    -- Progresso
    valor_atual DECIMAL(15, 2) DEFAULT 0,
    percentual_atingido DECIMAL(5, 2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'em_andamento',
    -- em_andamento, atingida, nao_atingida, cancelada

    -- Alertas
    alerta_50 BOOLEAN DEFAULT false,
    alerta_80 BOOLEAN DEFAULT false,
    alerta_100 BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_goals IS 'Metas e objetivos com acompanhamento';

CREATE INDEX IF NOT EXISTS idx_mt_goals_tenant ON mt_goals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_goals_franchise ON mt_goals(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_goals_user ON mt_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_goals_periodo ON mt_goals(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_mt_goals_status ON mt_goals(status);

-- =============================================================================
-- PARTE 11: RECRUTAMENTO
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_job_positions: Vagas de emprego
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_job_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    requisitos TEXT,
    beneficios TEXT,

    -- Detalhes
    departamento VARCHAR(100),
    nivel VARCHAR(50), -- estagio, junior, pleno, senior, gerente
    tipo_contrato VARCHAR(50), -- clt, pj, estagio, temporario
    modalidade VARCHAR(50), -- presencial, remoto, hibrido

    -- Salário
    faixa_salarial_min DECIMAL(10, 2),
    faixa_salarial_max DECIMAL(10, 2),
    exibir_salario BOOLEAN DEFAULT false,

    -- Vagas
    quantidade_vagas INTEGER DEFAULT 1,
    vagas_preenchidas INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'aberta', -- rascunho, aberta, pausada, encerrada

    -- Publicação
    publicada BOOLEAN DEFAULT false,
    publicada_em TIMESTAMPTZ,
    expira_em DATE,

    -- Métricas
    total_candidatos INTEGER DEFAULT 0,
    total_visualizacoes INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_job_positions IS 'Vagas de emprego';

CREATE INDEX IF NOT EXISTS idx_mt_job_positions_tenant ON mt_job_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_job_positions_franchise ON mt_job_positions(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_job_positions_status ON mt_job_positions(status);

-- -----------------------------------------------------------------------------
-- mt_candidates: Candidatos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    position_id UUID REFERENCES mt_job_positions(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),

    -- Documentos
    cpf VARCHAR(14),
    data_nascimento DATE,

    -- Endereço
    cidade VARCHAR(100),
    estado VARCHAR(2),

    -- Profissional
    formacao TEXT,
    experiencia TEXT,
    curriculo_url TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,

    -- Pretensão
    pretensao_salarial DECIMAL(10, 2),
    disponibilidade VARCHAR(50),

    -- Avaliação
    rating INTEGER, -- 1-5
    notas TEXT,
    avaliado_por UUID,

    -- Status
    status VARCHAR(30) DEFAULT 'novo',
    -- novo, em_analise, entrevista, aprovado, reprovado, desistiu, contratado

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_candidates IS 'Candidatos a vagas';

CREATE INDEX IF NOT EXISTS idx_mt_candidates_tenant ON mt_candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_candidates_position ON mt_candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_mt_candidates_email ON mt_candidates(email);
CREATE INDEX IF NOT EXISTS idx_mt_candidates_status ON mt_candidates(status);

-- -----------------------------------------------------------------------------
-- mt_interviews: Entrevistas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES mt_candidates(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES mt_job_positions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Agendamento
    data_entrevista TIMESTAMPTZ NOT NULL,
    duracao_minutos INTEGER DEFAULT 60,
    local_ou_link TEXT,
    tipo VARCHAR(50), -- presencial, video, telefone

    -- Entrevistador
    entrevistador_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    entrevistador_nome VARCHAR(255),

    -- Etapa
    etapa INTEGER DEFAULT 1,
    etapa_nome VARCHAR(100),

    -- Status
    status VARCHAR(30) DEFAULT 'agendada',
    -- agendada, confirmada, realizada, cancelada, no_show

    -- Avaliação
    nota INTEGER, -- 1-10
    feedback TEXT,
    recomendacao VARCHAR(50), -- aprovar, reprovar, proxima_etapa

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_interviews IS 'Entrevistas agendadas';

CREATE INDEX IF NOT EXISTS idx_mt_interviews_candidate ON mt_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_mt_interviews_position ON mt_interviews(position_id);
CREATE INDEX IF NOT EXISTS idx_mt_interviews_data ON mt_interviews(data_entrevista);
CREATE INDEX IF NOT EXISTS idx_mt_interviews_status ON mt_interviews(status);

-- =============================================================================
-- TRIGGERS para updated_at
-- =============================================================================

CREATE TRIGGER trigger_mt_leads_updated_at
    BEFORE UPDATE ON mt_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_funnels_updated_at
    BEFORE UPDATE ON mt_funnels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_funnel_stages_updated_at
    BEFORE UPDATE ON mt_funnel_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_funnel_leads_updated_at
    BEFORE UPDATE ON mt_funnel_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_appointments_updated_at
    BEFORE UPDATE ON mt_appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_forms_updated_at
    BEFORE UPDATE ON mt_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_form_fields_updated_at
    BEFORE UPDATE ON mt_form_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_whatsapp_sessions_updated_at
    BEFORE UPDATE ON mt_whatsapp_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_whatsapp_conversations_updated_at
    BEFORE UPDATE ON mt_whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_whatsapp_templates_updated_at
    BEFORE UPDATE ON mt_whatsapp_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_services_updated_at
    BEFORE UPDATE ON mt_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_campaigns_updated_at
    BEFORE UPDATE ON mt_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_influencers_updated_at
    BEFORE UPDATE ON mt_influencers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_influencer_contracts_updated_at
    BEFORE UPDATE ON mt_influencer_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_partnerships_updated_at
    BEFORE UPDATE ON mt_partnerships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_goals_updated_at
    BEFORE UPDATE ON mt_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_job_positions_updated_at
    BEFORE UPDATE ON mt_job_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_candidates_updated_at
    BEFORE UPDATE ON mt_candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_interviews_updated_at
    BEFORE UPDATE ON mt_interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_lead_scoring_rules_updated_at
    BEFORE UPDATE ON mt_lead_scoring_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 006
-- =============================================================================
