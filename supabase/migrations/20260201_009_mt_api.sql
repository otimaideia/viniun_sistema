-- =============================================================================
-- MULTI-TENANT MIGRATION: API & Webhooks Tables
-- Data: 01/02/2026
-- Descrição: Tabelas do módulo API e Webhooks (CORE)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_api_keys: Chaves de API por tenant/franquia
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Chave
    key_prefix VARCHAR(10) NOT NULL, -- yk_ (yeslaser key)
    key_hash TEXT NOT NULL, -- Hash da chave completa
    key_preview VARCHAR(20), -- Últimos 4 caracteres para identificação

    -- Permissões
    scopes TEXT[] DEFAULT '{}', -- leads:read, leads:write, etc
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,

    -- Restrições
    ip_whitelist TEXT[], -- IPs permitidos (NULL = todos)
    allowed_origins TEXT[], -- Origins permitidas para CORS

    -- Validade
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revoked_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_api_keys IS 'Chaves de API para acesso externo';

CREATE INDEX IF NOT EXISTS idx_mt_api_keys_tenant ON mt_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_api_keys_franchise ON mt_api_keys(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_api_keys_prefix ON mt_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_mt_api_keys_active ON mt_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_mt_api_keys_expires ON mt_api_keys(expires_at);

-- -----------------------------------------------------------------------------
-- mt_api_logs: Log de chamadas à API
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES mt_api_keys(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Request
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    query_params JSONB,
    headers JSONB,
    body JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Response
    status_code INTEGER,
    response_body JSONB,
    response_time_ms INTEGER,

    -- Erro
    error_message TEXT,
    error_code VARCHAR(50),

    -- Rate limiting
    rate_limit_remaining INTEGER,
    rate_limit_reset TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_api_logs IS 'Log de todas as chamadas à API';

-- Particionamento por mês recomendado para esta tabela em produção
CREATE INDEX IF NOT EXISTS idx_mt_api_logs_key ON mt_api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_mt_api_logs_tenant ON mt_api_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_api_logs_created ON mt_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_api_logs_path ON mt_api_logs(path);
CREATE INDEX IF NOT EXISTS idx_mt_api_logs_status ON mt_api_logs(status_code);

-- -----------------------------------------------------------------------------
-- mt_webhooks: Configuração de webhooks de saída
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Destino
    url TEXT NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',

    -- Autenticação
    auth_type VARCHAR(20), -- none, basic, bearer, api_key, hmac
    auth_config JSONB DEFAULT '{}',
    -- basic: {"username": "...", "password": "..."}
    -- bearer: {"token": "..."}
    -- api_key: {"header": "X-API-Key", "value": "..."}
    -- hmac: {"secret": "...", "header": "X-Signature", "algorithm": "sha256"}

    -- Headers customizados
    custom_headers JSONB DEFAULT '{}',

    -- Eventos
    eventos TEXT[] NOT NULL, -- lead.created, lead.updated, agendamento.created, etc

    -- Filtros
    filtros JSONB, -- Condições para disparar o webhook

    -- Payload
    payload_template JSONB, -- Template customizado do payload
    include_full_object BOOLEAN DEFAULT true,

    -- Retry
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    timeout_seconds INTEGER DEFAULT 30,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error_message TEXT,

    -- Métricas
    total_triggers INTEGER DEFAULT 0,
    total_success INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_webhooks IS 'Webhooks configurados para envio de eventos';

CREATE INDEX IF NOT EXISTS idx_mt_webhooks_tenant ON mt_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_webhooks_franchise ON mt_webhooks(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_webhooks_active ON mt_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_mt_webhooks_eventos ON mt_webhooks USING GIN(eventos);

-- -----------------------------------------------------------------------------
-- mt_webhook_logs: Log de envios de webhooks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES mt_webhooks(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Evento
    evento VARCHAR(100) NOT NULL,
    event_id UUID, -- ID do registro que disparou

    -- Request
    request_url TEXT NOT NULL,
    request_method VARCHAR(10),
    request_headers JSONB,
    request_body JSONB,

    -- Response
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, sending, success, failed, retrying

    -- Retry
    attempt INTEGER DEFAULT 1,
    next_retry_at TIMESTAMPTZ,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE mt_webhook_logs IS 'Log de envios de webhooks';

CREATE INDEX IF NOT EXISTS idx_mt_webhook_logs_webhook ON mt_webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_mt_webhook_logs_tenant ON mt_webhook_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_webhook_logs_status ON mt_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_mt_webhook_logs_created ON mt_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_webhook_logs_next_retry ON mt_webhook_logs(next_retry_at) WHERE status = 'retrying';

-- -----------------------------------------------------------------------------
-- mt_webhook_incoming: Webhooks recebidos de sistemas externos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_webhook_incoming (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE SET NULL,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    source VARCHAR(100), -- waha, meta, google, stripe, etc
    endpoint VARCHAR(255) NOT NULL,

    -- Request
    method VARCHAR(10),
    headers JSONB,
    body JSONB,
    query_params JSONB,
    ip_address VARCHAR(45),

    -- Validação
    signature_valid BOOLEAN,
    signature_header VARCHAR(100),

    -- Processamento
    status VARCHAR(20) DEFAULT 'received',
    -- received, processing, processed, failed, ignored

    processed_at TIMESTAMPTZ,
    error_message TEXT,

    -- Resultado
    result JSONB,
    actions_taken TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_webhook_incoming IS 'Webhooks recebidos de sistemas externos';

CREATE INDEX IF NOT EXISTS idx_mt_webhook_incoming_tenant ON mt_webhook_incoming(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_webhook_incoming_source ON mt_webhook_incoming(source);
CREATE INDEX IF NOT EXISTS idx_mt_webhook_incoming_status ON mt_webhook_incoming(status);
CREATE INDEX IF NOT EXISTS idx_mt_webhook_incoming_created ON mt_webhook_incoming(created_at DESC);

-- -----------------------------------------------------------------------------
-- mt_api_rate_limits: Controle de rate limiting
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES mt_api_keys(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificador (pode ser por key, tenant, ou IP)
    identifier VARCHAR(255) NOT NULL,
    identifier_type VARCHAR(20) NOT NULL, -- api_key, tenant, ip

    -- Contadores
    requests_minute INTEGER DEFAULT 0,
    requests_hour INTEGER DEFAULT 0,
    requests_day INTEGER DEFAULT 0,

    -- Janelas de tempo
    minute_window TIMESTAMPTZ,
    hour_window TIMESTAMPTZ,
    day_window TIMESTAMPTZ,

    -- Bloqueio
    blocked_until TIMESTAMPTZ,
    block_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_api_rate_limits IS 'Controle de rate limiting da API';

CREATE UNIQUE INDEX IF NOT EXISTS idx_mt_api_rate_limits_identifier ON mt_api_rate_limits(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_mt_api_rate_limits_key ON mt_api_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_mt_api_rate_limits_blocked ON mt_api_rate_limits(blocked_until);

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trigger_mt_api_keys_updated_at
    BEFORE UPDATE ON mt_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_webhooks_updated_at
    BEFORE UPDATE ON mt_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_api_rate_limits_updated_at
    BEFORE UPDATE ON mt_api_rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 009
-- =============================================================================
