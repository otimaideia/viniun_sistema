-- =============================================================================
-- MULTI-TENANT MIGRATION: Missing Tables from Plan
-- Data: 01/02/2026
-- Descrição: Tabelas que faltaram nas migrations anteriores
-- =============================================================================

-- -----------------------------------------------------------------------------
-- LEAD SCORING - Tabelas complementares
-- -----------------------------------------------------------------------------

-- mt_lead_scores: Scores calculados por lead
CREATE TABLE IF NOT EXISTS mt_lead_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES mt_leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Scores
    score_total INTEGER DEFAULT 0,
    score_demografico INTEGER DEFAULT 0,
    score_comportamental INTEGER DEFAULT 0,
    score_engajamento INTEGER DEFAULT 0,
    score_intencao INTEGER DEFAULT 0,

    -- Classificação
    classificacao VARCHAR(20) DEFAULT 'frio', -- frio, morno, quente, qualificado

    -- Última atualização
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_lead_scores_unique UNIQUE(lead_id)
);

COMMENT ON TABLE mt_lead_scores IS 'Scores calculados e classificação de leads';

CREATE INDEX IF NOT EXISTS idx_mt_lead_scores_lead ON mt_lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_lead_scores_tenant ON mt_lead_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_lead_scores_classificacao ON mt_lead_scores(classificacao);
CREATE INDEX IF NOT EXISTS idx_mt_lead_scores_total ON mt_lead_scores(score_total DESC);

-- mt_lead_scoring_config: Configuração de scoring por tenant
CREATE TABLE IF NOT EXISTS mt_lead_scoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Nome e descrição
    nome VARCHAR(100) NOT NULL DEFAULT 'Configuração Padrão',
    descricao TEXT,

    -- Pesos das categorias (soma = 100)
    peso_demografico INTEGER DEFAULT 25,
    peso_comportamental INTEGER DEFAULT 25,
    peso_engajamento INTEGER DEFAULT 25,
    peso_intencao INTEGER DEFAULT 25,

    -- Limiares de classificação
    limiar_frio INTEGER DEFAULT 0,
    limiar_morno INTEGER DEFAULT 30,
    limiar_quente INTEGER DEFAULT 60,
    limiar_qualificado INTEGER DEFAULT 80,

    -- Decay (perda de pontos ao longo do tempo)
    decay_enabled BOOLEAN DEFAULT true,
    decay_days INTEGER DEFAULT 30, -- dias para começar decay
    decay_percent INTEGER DEFAULT 10, -- % perdido por período

    -- Controle
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_lead_scoring_config IS 'Configurações de lead scoring por tenant';

CREATE INDEX IF NOT EXISTS idx_mt_lead_scoring_config_tenant ON mt_lead_scoring_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_lead_scoring_config_active ON mt_lead_scoring_config(tenant_id, is_active);

-- mt_lead_score_history: Histórico de mudanças de score
CREATE TABLE IF NOT EXISTS mt_lead_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES mt_leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Score anterior e novo
    score_anterior INTEGER,
    score_novo INTEGER,
    delta INTEGER,

    -- Classificação anterior e nova
    classificacao_anterior VARCHAR(20),
    classificacao_nova VARCHAR(20),

    -- Motivo da mudança
    motivo VARCHAR(100), -- regra_aplicada, decay, manual, reset
    rule_id UUID REFERENCES mt_lead_scoring_rules(id) ON DELETE SET NULL,
    descricao TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_lead_score_history IS 'Histórico de mudanças de score de leads';

CREATE INDEX IF NOT EXISTS idx_mt_lead_score_history_lead ON mt_lead_score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_lead_score_history_tenant ON mt_lead_score_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_lead_score_history_created ON mt_lead_score_history(created_at DESC);

-- -----------------------------------------------------------------------------
-- ANALYTICS - Formulários e Campanhas
-- -----------------------------------------------------------------------------

-- mt_form_analytics: Métricas de formulários
CREATE TABLE IF NOT EXISTS mt_form_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES mt_forms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Período
    data DATE NOT NULL,
    hora INTEGER, -- 0-23, NULL para diário

    -- Métricas de visualização
    visualizacoes INTEGER DEFAULT 0,
    visitantes_unicos INTEGER DEFAULT 0,

    -- Métricas de interação
    inicios INTEGER DEFAULT 0, -- começou a preencher
    abandonos INTEGER DEFAULT 0,
    submissoes INTEGER DEFAULT 0,

    -- Taxas calculadas
    taxa_conversao DECIMAL(5, 2) DEFAULT 0, -- submissoes/visualizacoes
    taxa_abandono DECIMAL(5, 2) DEFAULT 0, -- abandonos/inicios

    -- Tempo médio
    tempo_medio_segundos INTEGER DEFAULT 0,

    -- Fontes de tráfego
    fontes JSONB DEFAULT '{}', -- {"google": 10, "direct": 5}

    -- Dispositivos
    dispositivos JSONB DEFAULT '{}', -- {"mobile": 60, "desktop": 40}

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_form_analytics_unique UNIQUE(form_id, data, hora)
);

COMMENT ON TABLE mt_form_analytics IS 'Métricas agregadas de formulários';

CREATE INDEX IF NOT EXISTS idx_mt_form_analytics_form ON mt_form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_mt_form_analytics_tenant ON mt_form_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_form_analytics_data ON mt_form_analytics(data DESC);

-- mt_campaign_analytics: Métricas de campanhas
CREATE TABLE IF NOT EXISTS mt_campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES mt_campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Período
    data DATE NOT NULL,
    hora INTEGER, -- 0-23, NULL para diário

    -- Métricas de alcance
    impressoes INTEGER DEFAULT 0,
    alcance INTEGER DEFAULT 0,
    cliques INTEGER DEFAULT 0,

    -- Métricas de custo
    custo DECIMAL(10, 2) DEFAULT 0,
    cpc DECIMAL(10, 4) DEFAULT 0, -- custo por clique
    cpm DECIMAL(10, 4) DEFAULT 0, -- custo por mil impressões

    -- Métricas de conversão
    leads_gerados INTEGER DEFAULT 0,
    conversoes INTEGER DEFAULT 0,
    cpl DECIMAL(10, 2) DEFAULT 0, -- custo por lead
    cpa DECIMAL(10, 2) DEFAULT 0, -- custo por aquisição

    -- Taxas
    ctr DECIMAL(5, 4) DEFAULT 0, -- click through rate
    taxa_conversao DECIMAL(5, 4) DEFAULT 0,

    -- Receita
    receita DECIMAL(12, 2) DEFAULT 0,
    roas DECIMAL(8, 4) DEFAULT 0, -- return on ad spend

    -- Por canal (se aplicável)
    canal VARCHAR(50), -- google, meta, tiktok

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_campaign_analytics_unique UNIQUE(campaign_id, data, hora, canal)
);

COMMENT ON TABLE mt_campaign_analytics IS 'Métricas agregadas de campanhas';

CREATE INDEX IF NOT EXISTS idx_mt_campaign_analytics_campaign ON mt_campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mt_campaign_analytics_tenant ON mt_campaign_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_campaign_analytics_data ON mt_campaign_analytics(data DESC);
CREATE INDEX IF NOT EXISTS idx_mt_campaign_analytics_canal ON mt_campaign_analytics(canal);

-- -----------------------------------------------------------------------------
-- NOTIFICAÇÕES
-- -----------------------------------------------------------------------------

-- mt_notifications: Notificações do sistema
CREATE TABLE IF NOT EXISTS mt_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,

    -- Tipo e categoria
    tipo VARCHAR(50) NOT NULL, -- lead, agendamento, tarefa, sistema, alerta
    categoria VARCHAR(50), -- novo_lead, lembrete, urgente, info
    prioridade VARCHAR(20) DEFAULT 'normal', -- baixa, normal, alta, urgente

    -- Conteúdo
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT,
    icone VARCHAR(50),
    cor VARCHAR(7),

    -- Link/ação
    action_url TEXT,
    action_type VARCHAR(50), -- navigate, modal, external
    action_data JSONB,

    -- Referência
    ref_type VARCHAR(50), -- lead, agendamento, tarefa
    ref_id UUID,

    -- Status
    lida BOOLEAN DEFAULT false,
    lida_em TIMESTAMPTZ,

    -- Arquivamento
    arquivada BOOLEAN DEFAULT false,
    arquivada_em TIMESTAMPTZ,

    -- Expiração
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_notifications IS 'Notificações do sistema por usuário';

CREATE INDEX IF NOT EXISTS idx_mt_notifications_user ON mt_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_notifications_tenant ON mt_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_notifications_tipo ON mt_notifications(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_notifications_lida ON mt_notifications(user_id, lida);
CREATE INDEX IF NOT EXISTS idx_mt_notifications_created ON mt_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_notifications_ref ON mt_notifications(ref_type, ref_id);

-- mt_notification_preferences: Preferências de notificação por usuário
CREATE TABLE IF NOT EXISTS mt_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Por tipo de notificação
    tipo VARCHAR(50) NOT NULL, -- lead, agendamento, tarefa, sistema

    -- Canais habilitados
    in_app BOOLEAN DEFAULT true,
    email BOOLEAN DEFAULT true,
    push BOOLEAN DEFAULT true,
    whatsapp BOOLEAN DEFAULT false,
    sms BOOLEAN DEFAULT false,

    -- Frequência
    frequencia VARCHAR(20) DEFAULT 'imediato', -- imediato, resumo_diario, resumo_semanal

    -- Horário silencioso
    silencioso_inicio TIME,
    silencioso_fim TIME,
    silencioso_dias INTEGER[], -- 0=dom, 1=seg, etc

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_notification_preferences_unique UNIQUE(user_id, tipo)
);

COMMENT ON TABLE mt_notification_preferences IS 'Preferências de notificação por usuário';

CREATE INDEX IF NOT EXISTS idx_mt_notification_preferences_user ON mt_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_notification_preferences_tenant ON mt_notification_preferences(tenant_id);

-- mt_notification_templates: Templates de notificação
CREATE TABLE IF NOT EXISTS mt_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE CASCADE, -- NULL = global

    -- Identificação
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Tipo
    tipo VARCHAR(50) NOT NULL, -- lead, agendamento, tarefa, sistema
    evento VARCHAR(100) NOT NULL, -- lead.created, agendamento.lembrete, etc

    -- Template por canal
    titulo_template TEXT NOT NULL,
    mensagem_template TEXT NOT NULL,
    email_subject_template TEXT,
    email_body_template TEXT,
    push_title_template TEXT,
    push_body_template TEXT,
    whatsapp_template_id VARCHAR(100),

    -- Variáveis disponíveis
    variaveis JSONB DEFAULT '[]', -- ["nome", "data", "unidade"]

    -- Configuração
    icone VARCHAR(50),
    cor VARCHAR(7),
    prioridade VARCHAR(20) DEFAULT 'normal',

    -- Controle
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- templates do sistema, não editáveis

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_notification_templates IS 'Templates de notificação reutilizáveis';

CREATE INDEX IF NOT EXISTS idx_mt_notification_templates_tenant ON mt_notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_notification_templates_codigo ON mt_notification_templates(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_notification_templates_evento ON mt_notification_templates(evento);
CREATE INDEX IF NOT EXISTS idx_mt_notification_templates_active ON mt_notification_templates(is_active);

-- mt_push_subscriptions: Inscrições para push notifications
CREATE TABLE IF NOT EXISTS mt_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Dispositivo
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(20), -- web, android, ios
    device_name VARCHAR(255),

    -- Push subscription (Web Push API)
    endpoint TEXT NOT NULL,
    p256dh_key TEXT,
    auth_key TEXT,

    -- FCM Token (Firebase)
    fcm_token TEXT,

    -- APNs (Apple)
    apns_token TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_push_subscriptions_unique UNIQUE(user_id, device_id)
);

COMMENT ON TABLE mt_push_subscriptions IS 'Inscrições de push notifications por dispositivo';

CREATE INDEX IF NOT EXISTS idx_mt_push_subscriptions_user ON mt_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_push_subscriptions_tenant ON mt_push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_push_subscriptions_device ON mt_push_subscriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_mt_push_subscriptions_active ON mt_push_subscriptions(is_active);

-- -----------------------------------------------------------------------------
-- REPORTS E DASHBOARD
-- -----------------------------------------------------------------------------

-- mt_reports_scheduled: Relatórios agendados
CREATE TABLE IF NOT EXISTS mt_reports_scheduled (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Tipo e configuração
    tipo VARCHAR(50) NOT NULL, -- leads, vendas, agendamentos, performance
    config JSONB NOT NULL DEFAULT '{}', -- filtros, colunas, agrupamentos

    -- Formato
    formato VARCHAR(20) DEFAULT 'pdf', -- pdf, excel, csv

    -- Agendamento
    frequencia VARCHAR(20) NOT NULL, -- diario, semanal, mensal, trimestral
    dia_semana INTEGER, -- 0-6 para semanal
    dia_mes INTEGER, -- 1-31 para mensal
    hora TIME DEFAULT '08:00',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',

    -- Próxima execução
    proxima_execucao TIMESTAMPTZ,
    ultima_execucao TIMESTAMPTZ,

    -- Destinatários
    destinatarios JSONB DEFAULT '[]', -- [{"email": "...", "user_id": "..."}]

    -- Controle
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_reports_scheduled IS 'Relatórios agendados para envio automático';

CREATE INDEX IF NOT EXISTS idx_mt_reports_scheduled_tenant ON mt_reports_scheduled(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_reports_scheduled_proxima ON mt_reports_scheduled(proxima_execucao);
CREATE INDEX IF NOT EXISTS idx_mt_reports_scheduled_active ON mt_reports_scheduled(is_active);

-- mt_reports_history: Histórico de relatórios gerados
CREATE TABLE IF NOT EXISTS mt_reports_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_id UUID REFERENCES mt_reports_scheduled(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Tipo
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    formato VARCHAR(20),

    -- Arquivo gerado
    file_url TEXT,
    file_size_bytes BIGINT,
    file_expires_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,

    -- Métricas
    total_registros INTEGER,
    tempo_geracao_ms INTEGER,

    -- Gerado por
    generated_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    generation_type VARCHAR(20) DEFAULT 'manual', -- manual, scheduled

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_reports_history IS 'Histórico de relatórios gerados';

CREATE INDEX IF NOT EXISTS idx_mt_reports_history_tenant ON mt_reports_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_reports_history_scheduled ON mt_reports_history(scheduled_id);
CREATE INDEX IF NOT EXISTS idx_mt_reports_history_status ON mt_reports_history(status);
CREATE INDEX IF NOT EXISTS idx_mt_reports_history_created ON mt_reports_history(created_at DESC);

-- mt_dashboard_widgets: Widgets personalizados do dashboard
CREATE TABLE IF NOT EXISTS mt_dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    user_id UUID REFERENCES mt_users(id) ON DELETE CASCADE, -- NULL = widget do tenant

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Tipo e visualização
    tipo VARCHAR(50) NOT NULL, -- kpi, chart, table, list, calendar
    subtipo VARCHAR(50), -- line, bar, pie, area, donut

    -- Dados
    data_source VARCHAR(100) NOT NULL, -- leads, agendamentos, vendas, custom
    query_config JSONB NOT NULL DEFAULT '{}',

    -- Layout
    posicao_x INTEGER DEFAULT 0,
    posicao_y INTEGER DEFAULT 0,
    largura INTEGER DEFAULT 1, -- em colunas (1-4)
    altura INTEGER DEFAULT 1, -- em linhas (1-3)

    -- Visual
    cor VARCHAR(7),
    icone VARCHAR(50),

    -- Configuração
    config JSONB DEFAULT '{}', -- opções específicas do tipo

    -- Controle
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- widget padrão do sistema

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_dashboard_widgets IS 'Widgets personalizados de dashboard';

CREATE INDEX IF NOT EXISTS idx_mt_dashboard_widgets_tenant ON mt_dashboard_widgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_dashboard_widgets_user ON mt_dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_dashboard_widgets_tipo ON mt_dashboard_widgets(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_dashboard_widgets_active ON mt_dashboard_widgets(is_active);

-- mt_benchmarks: Benchmarks e metas do setor
CREATE TABLE IF NOT EXISTS mt_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE CASCADE, -- NULL = global

    -- Categoria
    categoria VARCHAR(50) NOT NULL, -- leads, vendas, atendimento, marketing
    metrica VARCHAR(100) NOT NULL, -- taxa_conversao, tempo_resposta, cac

    -- Valores
    valor_minimo DECIMAL(15, 4),
    valor_medio DECIMAL(15, 4),
    valor_bom DECIMAL(15, 4),
    valor_excelente DECIMAL(15, 4),

    -- Unidade
    unidade VARCHAR(20), -- percentual, minutos, reais, unidades

    -- Período de referência
    periodo VARCHAR(20), -- diario, semanal, mensal, anual

    -- Fonte
    fonte VARCHAR(255), -- mercado, historico, meta_interna
    data_referencia DATE,

    -- Controle
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_benchmarks IS 'Benchmarks e metas de referência';

CREATE INDEX IF NOT EXISTS idx_mt_benchmarks_tenant ON mt_benchmarks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_benchmarks_categoria ON mt_benchmarks(categoria);
CREATE INDEX IF NOT EXISTS idx_mt_benchmarks_metrica ON mt_benchmarks(metrica);

-- mt_module_features: Features disponíveis por módulo
CREATE TABLE IF NOT EXISTS mt_module_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES mt_modules(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Tipo
    tipo VARCHAR(20) DEFAULT 'feature', -- feature, config, integration

    -- Requisitos
    requires_plan VARCHAR(50)[], -- ['pro', 'enterprise']
    requires_modules UUID[], -- módulos dependentes

    -- Configuração padrão
    config_default JSONB DEFAULT '{}',

    -- Controle
    is_active BOOLEAN DEFAULT true,
    is_beta BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_module_features_unique UNIQUE(module_id, codigo)
);

COMMENT ON TABLE mt_module_features IS 'Features disponíveis em cada módulo';

CREATE INDEX IF NOT EXISTS idx_mt_module_features_module ON mt_module_features(module_id);
CREATE INDEX IF NOT EXISTS idx_mt_module_features_codigo ON mt_module_features(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_module_features_active ON mt_module_features(is_active);

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------

CREATE TRIGGER trigger_mt_lead_scores_updated_at
    BEFORE UPDATE ON mt_lead_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_lead_scoring_config_updated_at
    BEFORE UPDATE ON mt_lead_scoring_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_form_analytics_updated_at
    BEFORE UPDATE ON mt_form_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_campaign_analytics_updated_at
    BEFORE UPDATE ON mt_campaign_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_notification_preferences_updated_at
    BEFORE UPDATE ON mt_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_notification_templates_updated_at
    BEFORE UPDATE ON mt_notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_push_subscriptions_updated_at
    BEFORE UPDATE ON mt_push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_reports_scheduled_updated_at
    BEFORE UPDATE ON mt_reports_scheduled
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_dashboard_widgets_updated_at
    BEFORE UPDATE ON mt_dashboard_widgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_benchmarks_updated_at
    BEFORE UPDATE ON mt_benchmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_module_features_updated_at
    BEFORE UPDATE ON mt_module_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- RLS para novas tabelas
-- -----------------------------------------------------------------------------

ALTER TABLE mt_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_lead_scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_lead_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_reports_scheduled ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_reports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_module_features ENABLE ROW LEVEL SECURITY;

-- Policies para tabelas com tenant_id
DO $$
DECLARE
    tbl TEXT;
    tables_with_tenant TEXT[] := ARRAY[
        'mt_lead_scores',
        'mt_lead_scoring_config',
        'mt_lead_score_history',
        'mt_form_analytics',
        'mt_campaign_analytics',
        'mt_notifications',
        'mt_notification_preferences',
        'mt_push_subscriptions',
        'mt_reports_scheduled',
        'mt_reports_history',
        'mt_dashboard_widgets'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_with_tenant
    LOOP
        -- Platform admin pode tudo
        EXECUTE format('
            CREATE POLICY %I ON %I
            FOR ALL
            TO authenticated
            USING (is_platform_admin() OR can_access_tenant(tenant_id))
            WITH CHECK (is_platform_admin() OR can_access_tenant(tenant_id))
        ', 'policy_' || tbl || '_access', tbl);
    END LOOP;
END
$$;

-- Policies para tabelas globais (notification_templates, benchmarks, module_features)
CREATE POLICY policy_mt_notification_templates_access ON mt_notification_templates
    FOR ALL
    TO authenticated
    USING (
        is_platform_admin()
        OR tenant_id IS NULL
        OR can_access_tenant(tenant_id)
    )
    WITH CHECK (
        is_platform_admin()
        OR (tenant_id IS NOT NULL AND can_access_tenant(tenant_id))
    );

CREATE POLICY policy_mt_benchmarks_access ON mt_benchmarks
    FOR ALL
    TO authenticated
    USING (
        is_platform_admin()
        OR tenant_id IS NULL
        OR can_access_tenant(tenant_id)
    )
    WITH CHECK (
        is_platform_admin()
        OR (tenant_id IS NOT NULL AND can_access_tenant(tenant_id))
    );

CREATE POLICY policy_mt_module_features_access ON mt_module_features
    FOR ALL
    TO authenticated
    USING (true) -- Todos podem ler features de módulos
    WITH CHECK (is_platform_admin()); -- Só platform admin pode modificar

-- =============================================================================
-- FIM DA MIGRATION 013
-- =============================================================================
