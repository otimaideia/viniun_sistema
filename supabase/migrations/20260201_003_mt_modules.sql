-- =============================================================================
-- MULTI-TENANT MIGRATION: Modules Tables
-- Data: 01/02/2026
-- Descrição: Catálogo de módulos e liberação por tenant
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_modules: Catálogo de módulos disponíveis no sistema
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificação
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50),
    categoria VARCHAR(50), -- vendas, operacao, comunicacao, marketing, rh, gestao, sistema

    -- Controle
    is_core BOOLEAN DEFAULT false, -- Módulos CORE são obrigatórios
    is_active BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,

    -- Rota base no frontend
    rota_base VARCHAR(100),

    -- Dependências (códigos de módulos que este depende)
    depends_on TEXT[] DEFAULT '{}',

    -- Features do módulo (descrição das funcionalidades)
    features JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_modules IS 'Catálogo de módulos disponíveis na plataforma (18 módulos totais, 8 CORE)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_modules_codigo ON mt_modules(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_modules_categoria ON mt_modules(categoria);
CREATE INDEX IF NOT EXISTS idx_mt_modules_is_core ON mt_modules(is_core);

-- -----------------------------------------------------------------------------
-- mt_tenant_modules: Módulos liberados para cada tenant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES mt_modules(id) ON DELETE CASCADE,

    -- Status
    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL = sem expiração

    -- Limites customizados (sobrescreve limites padrão)
    limits JSONB DEFAULT '{}',

    -- Quem ativou
    activated_by UUID,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_tenant_modules_unique UNIQUE(tenant_id, module_id)
);

COMMENT ON TABLE mt_tenant_modules IS 'Módulos liberados para cada empresa (tenant)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_tenant_modules_tenant ON mt_tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_tenant_modules_module ON mt_tenant_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_mt_tenant_modules_active ON mt_tenant_modules(tenant_id, is_active);

-- -----------------------------------------------------------------------------
-- mt_tenant_integrations: Integrações configuradas pelo tenant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_tenant_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    integration_type_id UUID NOT NULL REFERENCES mt_integration_types(id) ON DELETE RESTRICT,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Credenciais (criptografadas em produção)
    credentials JSONB NOT NULL DEFAULT '{}',

    -- Recursos habilitados
    recursos_ativos JSONB DEFAULT '{
        "postar": true,
        "mensagens": true,
        "campanhas": true,
        "investimentos": true,
        "relatorios": true
    }',

    -- Status
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'pending', -- pending, connected, error, expired
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,

    -- Métricas
    total_requests INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Constraint: Um tipo de integração por tenant (pode ter múltiplas contas do mesmo tipo usando nome diferente)
    CONSTRAINT mt_tenant_integrations_unique UNIQUE(tenant_id, integration_type_id, nome)
);

COMMENT ON TABLE mt_tenant_integrations IS 'Integrações corporativas configuradas pelo tenant';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_tenant_integrations_tenant ON mt_tenant_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_tenant_integrations_type ON mt_tenant_integrations(integration_type_id);
CREATE INDEX IF NOT EXISTS idx_mt_tenant_integrations_status ON mt_tenant_integrations(status);

-- -----------------------------------------------------------------------------
-- INSERIR DADOS INICIAIS: 18 Módulos
-- -----------------------------------------------------------------------------
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, is_core, ordem, rota_base) VALUES
-- VENDAS (2 módulos)
('leads', 'Gestão de Leads', 'CRM completo com 80+ campos, tracking UTM, indicações e Lead Scoring', 'Users', 'vendas', true, 1, '/leads'),
('funil', 'Funil de Vendas', 'Kanban com drag-and-drop, etapas customizáveis e automações', 'LayoutGrid', 'vendas', false, 2, '/funil'),

-- OPERAÇÃO (1 módulo CORE)
('agendamentos', 'Agendamentos', 'Calendário de consultas/procedimentos com check-in por totem', 'Calendar', 'operacao', true, 3, '/agendamentos'),

-- COMUNICAÇÃO (2 módulos, 1 CORE)
('whatsapp', 'WhatsApp Business', 'Chat em tempo real, mídia, templates e automações via WAHA', 'MessageCircle', 'comunicacao', false, 4, '/whatsapp'),
('chatbot', 'Chatbot IA', 'Atendimento automático inteligente com IA generativa', 'Bot', 'comunicacao', true, 5, '/chatbot'),

-- MARKETING (4 módulos)
('formularios', 'Formulários', 'Builder visual com 15 tipos de campos, analytics e testes A/B', 'FormInput', 'marketing', false, 6, '/formularios'),
('influenciadoras', 'Influenciadoras', 'Gestão de influenciadores com contratos, pagamentos e portal', 'Star', 'marketing', false, 7, '/influenciadoras'),
('parcerias', 'Parcerias B2B', 'Gestão de parcerias empresariais com QR Code e portal', 'Handshake', 'marketing', false, 8, '/parcerias'),
('campanhas', 'Campanhas', 'Gestão de campanhas de marketing com budget e ROI', 'Megaphone', 'marketing', false, 9, '/campanhas'),

-- RH (1 módulo)
('recrutamento', 'Recrutamento', 'Gestão de vagas, candidatos e entrevistas', 'UserPlus', 'rh', false, 10, '/recrutamento'),

-- GESTÃO (4 módulos, 1 CORE)
('metas', 'Metas', 'Definição e acompanhamento de objetivos com alertas', 'Target', 'gestao', false, 11, '/metas'),
('franqueados', 'Franqueados', 'Gestão de franquias e unidades', 'Building2', 'gestao', true, 12, '/franqueados'),
('servicos', 'Serviços', 'Catálogo de serviços/procedimentos', 'Package', 'gestao', false, 13, '/servicos'),

-- SISTEMA (5 módulos, 4 CORE)
('usuarios', 'Usuários', 'Gestão de usuários e permissões RBAC', 'UserCog', 'sistema', true, 14, '/usuarios'),
('relatorios', 'Relatórios', 'Analytics, dashboards e exports', 'BarChart3', 'sistema', true, 15, '/relatorios'),
('integracoes', 'Integrações', 'Configuração de integrações externas', 'Plug', 'sistema', false, 16, '/integracoes'),
('automacoes', 'Automações', 'Workflows e triggers automáticos', 'Zap', 'sistema', true, 17, '/automacoes'),
('api_webhooks', 'API e Webhooks', 'Conexão com sistemas externos', 'Webhook', 'sistema', true, 18, '/api')

ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    icone = EXCLUDED.icone,
    categoria = EXCLUDED.categoria,
    is_core = EXCLUDED.is_core,
    ordem = EXCLUDED.ordem,
    rota_base = EXCLUDED.rota_base,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trigger_mt_modules_updated_at
    BEFORE UPDATE ON mt_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_tenant_modules_updated_at
    BEFORE UPDATE ON mt_tenant_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_tenant_integrations_updated_at
    BEFORE UPDATE ON mt_tenant_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 003
-- =============================================================================
