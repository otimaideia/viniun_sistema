-- =============================================================================
-- MULTI-TENANT MIGRATION: Franchise Tables
-- Data: 01/02/2026
-- Descrição: Tabelas de franquias e suas configurações
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_franchises: Cadastro de franquias
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_franchises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- IDENTIFICAÇÃO
    codigo VARCHAR(20),
    nome VARCHAR(255) NOT NULL,
    nome_curto VARCHAR(50),

    -- TIPO
    tipo VARCHAR(50) DEFAULT 'franquia', -- franquia, propria, parceira

    -- DOCUMENTOS
    cnpj VARCHAR(18),
    inscricao_estadual VARCHAR(20),

    -- ENDEREÇO
    cep VARCHAR(10),
    endereco VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    pais VARCHAR(50) DEFAULT 'Brasil',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- CONTATO (Padrão Internacional +5511999999999)
    telefone VARCHAR(20),
    telefone_secundario VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(255),

    -- RESPONSÁVEL
    responsavel_nome VARCHAR(255),
    responsavel_telefone VARCHAR(20),
    responsavel_email VARCHAR(255),

    -- OPERAÇÃO
    horario_funcionamento JSONB DEFAULT '{
        "segunda": {"abre": "09:00", "fecha": "18:00"},
        "terca": {"abre": "09:00", "fecha": "18:00"},
        "quarta": {"abre": "09:00", "fecha": "18:00"},
        "quinta": {"abre": "09:00", "fecha": "18:00"},
        "sexta": {"abre": "09:00", "fecha": "18:00"},
        "sabado": {"abre": "09:00", "fecha": "13:00"},
        "domingo": null
    }',
    capacidade_atendimento INTEGER,

    -- INTEGRAÇÃO com sistema legado
    api_token VARCHAR(255),
    external_id VARCHAR(100),

    -- CONTROLE
    status VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo, pendente, suspenso
    data_inauguracao DATE,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_franchises IS 'Franquias/unidades de cada tenant';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_franchises_tenant ON mt_franchises(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchises_codigo ON mt_franchises(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_franchises_cidade ON mt_franchises(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_mt_franchises_status ON mt_franchises(status);
CREATE INDEX IF NOT EXISTS idx_mt_franchises_tenant_status ON mt_franchises(tenant_id, status);

-- -----------------------------------------------------------------------------
-- mt_franchise_modules: Módulos liberados para cada franquia
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_franchise_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES mt_modules(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Status
    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Quem ativou
    activated_by UUID,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_franchise_modules_unique UNIQUE(franchise_id, module_id)
);

COMMENT ON TABLE mt_franchise_modules IS 'Módulos liberados para cada franquia (apenas módulos que o tenant possui)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_franchise_modules_franchise ON mt_franchise_modules(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchise_modules_module ON mt_franchise_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchise_modules_tenant ON mt_franchise_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchise_modules_active ON mt_franchise_modules(franchise_id, is_active);

-- -----------------------------------------------------------------------------
-- mt_franchise_integrations: Integrações configuradas pela franquia
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_franchise_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    integration_type_id UUID NOT NULL REFERENCES mt_integration_types(id) ON DELETE RESTRICT,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Credenciais PRÓPRIAS da franquia (criptografadas em produção)
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
    last_request_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Constraint: Uma integração por tipo por franquia
    CONSTRAINT mt_franchise_integrations_unique UNIQUE(franchise_id, integration_type_id)
);

COMMENT ON TABLE mt_franchise_integrations IS 'Credenciais de integração PRÓPRIAS de cada franquia (WhatsApp próprio, Meta próprio, etc)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_franchise_integrations_franchise ON mt_franchise_integrations(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchise_integrations_tenant ON mt_franchise_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchise_integrations_type ON mt_franchise_integrations(integration_type_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchise_integrations_status ON mt_franchise_integrations(status);

-- -----------------------------------------------------------------------------
-- mt_franchise_settings: Configurações específicas da franquia
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_franchise_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Configuração
    chave VARCHAR(100) NOT NULL,
    valor TEXT,
    tipo VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json

    -- Descrição
    descricao TEXT,
    categoria VARCHAR(50) DEFAULT 'geral',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_franchise_settings_unique UNIQUE(franchise_id, chave)
);

COMMENT ON TABLE mt_franchise_settings IS 'Configurações personalizadas por franquia';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_franchise_settings_franchise ON mt_franchise_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchise_settings_tenant ON mt_franchise_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_franchise_settings_chave ON mt_franchise_settings(chave);

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trigger_mt_franchises_updated_at
    BEFORE UPDATE ON mt_franchises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_franchise_modules_updated_at
    BEFORE UPDATE ON mt_franchise_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_franchise_integrations_updated_at
    BEFORE UPDATE ON mt_franchise_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_franchise_settings_updated_at
    BEFORE UPDATE ON mt_franchise_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 004
-- =============================================================================
