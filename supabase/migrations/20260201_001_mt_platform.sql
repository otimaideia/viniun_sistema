-- =============================================================================
-- MULTI-TENANT MIGRATION: Platform Tables
-- Data: 01/02/2026
-- Descrição: Tabelas de configuração global do sistema multi-tenant
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_platform_settings: Configurações globais da plataforma
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificação
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json

    -- Descrição
    descricao TEXT,
    categoria VARCHAR(50) DEFAULT 'geral',

    -- Controle
    is_public BOOLEAN DEFAULT false,
    is_editable BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentário da tabela
COMMENT ON TABLE mt_platform_settings IS 'Configurações globais da plataforma multi-tenant';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_platform_settings_chave ON mt_platform_settings(chave);
CREATE INDEX IF NOT EXISTS idx_mt_platform_settings_categoria ON mt_platform_settings(categoria);

-- -----------------------------------------------------------------------------
-- mt_integration_types: Tipos de integração disponíveis no sistema
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_integration_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificação
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50),
    categoria VARCHAR(50), -- comunicacao, social, ads, maps

    -- Recursos disponíveis
    recursos JSONB DEFAULT '{
        "postar": false,
        "mensagens": false,
        "campanhas": false,
        "investimentos": false,
        "relatorios": false,
        "webhooks": false
    }',

    -- Campos de configuração (schema dos campos necessários)
    campos_config JSONB DEFAULT '[]',

    -- Documentação
    docs_url TEXT,
    setup_instructions TEXT,

    -- Controle
    is_active BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_integration_types IS 'Catálogo de tipos de integração disponíveis (WhatsApp, Meta, Google Ads, etc.)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_integration_types_codigo ON mt_integration_types(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_integration_types_categoria ON mt_integration_types(categoria);

-- -----------------------------------------------------------------------------
-- mt_platform_integrations: Integrações do sistema (nível platform)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_platform_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_type_id UUID NOT NULL REFERENCES mt_integration_types(id) ON DELETE RESTRICT,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Credenciais (criptografadas em produção)
    credentials JSONB NOT NULL DEFAULT '{}',

    -- Configurações
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    uso VARCHAR(50), -- sistema, tokens, emails, etc.

    -- Limites
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,

    -- Status e Métricas
    status VARCHAR(20) DEFAULT 'pending', -- pending, connected, error, expired
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    total_requests INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_platform_integrations IS 'Integrações de nível de plataforma (WhatsApp para tokens de login, SMTP do sistema)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_platform_integrations_type ON mt_platform_integrations(integration_type_id);
CREATE INDEX IF NOT EXISTS idx_mt_platform_integrations_status ON mt_platform_integrations(status);

-- -----------------------------------------------------------------------------
-- mt_integration_logs: Log de uso das integrações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referência (pode ser platform, tenant ou franchise integration)
    integration_source VARCHAR(20) NOT NULL, -- platform, tenant, franchise
    integration_id UUID NOT NULL,

    -- Contexto
    tenant_id UUID,
    franchise_id UUID,
    user_id UUID,

    -- Request
    method VARCHAR(10),
    endpoint TEXT,
    request_body JSONB,

    -- Response
    response_status INTEGER,
    response_body JSONB,
    response_time_ms INTEGER,

    -- Erro (se houver)
    error_message TEXT,
    error_code VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_integration_logs IS 'Log de todas as chamadas às integrações externas';

-- Índices (particionado por data para performance)
CREATE INDEX IF NOT EXISTS idx_mt_integration_logs_integration ON mt_integration_logs(integration_source, integration_id);
CREATE INDEX IF NOT EXISTS idx_mt_integration_logs_tenant ON mt_integration_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_integration_logs_created ON mt_integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_integration_logs_status ON mt_integration_logs(response_status);

-- -----------------------------------------------------------------------------
-- INSERIR DADOS INICIAIS: Tipos de Integração
-- -----------------------------------------------------------------------------
INSERT INTO mt_integration_types (codigo, nome, descricao, icone, categoria, recursos, ordem) VALUES
-- Comunicação
('whatsapp', 'WhatsApp Business', 'Integração com WhatsApp Business via WAHA API', 'MessageCircle', 'comunicacao',
 '{"postar": false, "mensagens": true, "campanhas": true, "investimentos": false, "relatorios": true, "webhooks": true}', 1),

('smtp', 'Email (SMTP)', 'Envio de emails via servidor SMTP', 'Mail', 'comunicacao',
 '{"postar": false, "mensagens": true, "campanhas": true, "investimentos": false, "relatorios": true, "webhooks": false}', 2),

-- Social
('meta', 'Meta (Facebook/Instagram)', 'Integração com Facebook e Instagram', 'Facebook', 'social',
 '{"postar": true, "mensagens": true, "campanhas": true, "investimentos": true, "relatorios": true, "webhooks": true}', 3),

('youtube', 'YouTube', 'Integração com YouTube', 'Youtube', 'social',
 '{"postar": true, "mensagens": true, "campanhas": false, "investimentos": false, "relatorios": true, "webhooks": true}', 4),

('tiktok', 'TikTok', 'Integração com TikTok', 'Music', 'social',
 '{"postar": true, "mensagens": true, "campanhas": false, "investimentos": false, "relatorios": true, "webhooks": true}', 5),

-- Ads
('google_ads', 'Google Ads', 'Integração com Google Ads', 'Target', 'ads',
 '{"postar": false, "mensagens": false, "campanhas": true, "investimentos": true, "relatorios": true, "webhooks": true}', 6),

('tiktok_ads', 'TikTok Ads', 'Integração com TikTok Ads Manager', 'Megaphone', 'ads',
 '{"postar": false, "mensagens": false, "campanhas": true, "investimentos": true, "relatorios": true, "webhooks": true}', 7),

-- Maps
('google_business', 'Google Meu Negócio', 'Integração com Google My Business', 'Building2', 'maps',
 '{"postar": true, "mensagens": true, "campanhas": false, "investimentos": false, "relatorios": true, "webhooks": true}', 8),

('google_maps', 'Google Maps', 'Integração com Google Maps API', 'MapPin', 'maps',
 '{"postar": false, "mensagens": false, "campanhas": false, "investimentos": false, "relatorios": false, "webhooks": false}', 9)

ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    recursos = EXCLUDED.recursos,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- INSERIR CONFIGURAÇÕES INICIAIS
-- -----------------------------------------------------------------------------
INSERT INTO mt_platform_settings (chave, valor, tipo, descricao, categoria) VALUES
('platform_name', 'YESlaser Multi-Tenant', 'string', 'Nome da plataforma', 'geral'),
('platform_version', '1.0.0', 'string', 'Versão da plataforma', 'geral'),
('max_tenants', '100', 'number', 'Número máximo de tenants', 'limites'),
('max_franchises_per_tenant', '200', 'number', 'Máximo de franquias por tenant', 'limites'),
('max_users_per_franchise', '50', 'number', 'Máximo de usuários por franquia', 'limites'),
('default_timezone', 'America/Sao_Paulo', 'string', 'Timezone padrão', 'localizacao'),
('default_locale', 'pt-BR', 'string', 'Idioma padrão', 'localizacao'),
('default_currency', 'BRL', 'string', 'Moeda padrão', 'localizacao'),
('maintenance_mode', 'false', 'boolean', 'Modo de manutenção ativo', 'sistema'),
('registration_enabled', 'true', 'boolean', 'Permitir novos cadastros', 'sistema')
ON CONFLICT (chave) DO UPDATE SET
    valor = EXCLUDED.valor,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- TRIGGER para updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas mt_*
CREATE TRIGGER trigger_mt_platform_settings_updated_at
    BEFORE UPDATE ON mt_platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_integration_types_updated_at
    BEFORE UPDATE ON mt_integration_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_platform_integrations_updated_at
    BEFORE UPDATE ON mt_platform_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 001
-- =============================================================================
